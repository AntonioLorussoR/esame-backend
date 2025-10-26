import Team from "../models/Team.js";
import Post from "../models/Post.js";
import mongoose from "mongoose";
import sendTelegramMessage from "../utils/sendTelegramMessage.js";


//Verificare se l'utente è admin del team o creatore dello stesso
const isAdmin = (team, userId) =>
  team?.members?.some(m =>
    String(m.user?._id || m.user) === String(userId) && (m.role === "Admin" || m.role === "Creator")
  );

//Restituisce i team di cui l'utente fa parte
export const getTeams = async (req, res) => {
  try {
    const userId = req.user.id;
    const teams = await Team.find({ "members.user": userId })
      .populate("members.user", "nomeUtente cognomeUtente email");
    res.json(teams);
  } catch (err) {
    console.error("Errore nel recupero dei team:", err);
    res.status(500).json({ message: "Errore nel recupero dei team" });
  }
};

// Creazione di un team
export const createTeam = async (req, res) => {
  try {
    const { name, description } = req.body;
    const userId = req.user.id;
    if (!userId) return res.status(401).json({ message: "Utente non autenticato" });

    const newTeam = new Team({
      name,
      description,
      accessCode: Team.generateAccessCode(),
      members: [{ user: userId, role: "Creator" }],
      telegramCode: Team.generateTelegramCode(),
    });

    await newTeam.save();
    const populated = await Team.findById(newTeam._id)
      .populate("members.user", "nomeUtente cognomeUtente email");
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: "Errore nella creazione del team" });
  }
};

// JOIN team tramite codice
export const joinTeamByCode = async (req, res) => {
  try {
    const { accessCode } = req.body;
    const team = await Team.findOne({ accessCode });
    if (!team) return res.status(404).json({ message: "Codice team non valido" });

    const alreadyMember = team.members.some(m => String(m.user) === String(req.user.id));
    if (!alreadyMember) {
      team.members.push({ user: req.user.id, role: "Member" });
      await team.save();
    }

    const populated = await Team.findById(team._id)
      .populate("members.user", "nomeUtente cognomeUtente email")
      .populate("posts.author", "nomeUtente cognomeUtente");
    res.json(populated);
    
  } catch (err) {
    res.status(500).json({ message: "Errore durante l'accesso al team" });
  }
};

//Aggiorna descrizione del team, possibile solo per Admin o Creator
export const updateTeamDescription = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { description } = req.body;
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: "Team non trovato" });

    if (!isAdmin(team, req.user.id)) {
      return res.status(403).json({ message: "Non sei admin" });
    }

    team.description = description ?? team.description;
    await team.save();
    res.json({ description: team.description });
  } catch (err) {
    res.status(500).json({ message: "Errore aggiornamento descrizione" });
  }
};

// La funzione delete team è visibile solo per il creatore dello stesso, se sei Admin non compare la possibilità (frontend)
export const deleteTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const userId = req.user.id;

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: "Team non trovato" });

    if (!isAdmin(team, userId)) {
      return res.status(403).json({ message: "Solo il Creator può eliminare il team" });
    }

    await Team.findByIdAndDelete(teamId);
    res.json({ message: "Team eliminato" });
  } catch {
    res.status(500).json({ message: "Errore interno del server durante l'eliminazione del team" });
  }
};


// Eseguibile da Admin e Creator. Nomina admin altro membro
export const makeAdmin = async (req, res) => {
  try {
    const { teamId, memberId } = req.params;
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: "Team non trovato" });

    if (!isAdmin(team, req.user.id)) {
      return res.status(403).json({ message: "Non sei admin" });
    }

    const member = team.members.find(
      m => String(m.user?._id || m.user) === String(memberId)
    );
    if (!member) return res.status(400).json({ message: "Membro non presente nel team" });

    if (member.role === "Creator") {
      return res.status(403).json({ message: "Non puoi modificare il ruolo del creatore" });
    }

    member.role = "Admin";
    await team.save();

    const populated = await Team.findById(teamId)
      .populate("members.user", "nomeUtente cognomeUtente email")
      .populate("posts.author", "nomeUtente cognomeUtente");

    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: "Errore nomina admin" });
  }
};


// GET posts (bacheca)
export const getPosts = async (req, res) => {
  try {
    const posts = await Post.find({ team: req.params.teamId })
      .sort({ date: -1 })
      .populate("author", "nomeUtente cognomeUtente");
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: "Errore nel recupero dei post" });
  }
};

//Aggiungi post
export const addPost = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Contenuto mancante" });
    }

    const team = await Team.findById(req.params.teamId).populate("members.user", "nomeUtente");
    if (!team) return res.status(404).json({ message: "Team non trovato" });

    if (!isAdmin(team, req.user.id)) {
      return res.status(403).json({ message: "Solo admin possono pubblicare" });
    }

    const post = await Post.create({
      content,
      author: req.user.id,
      team: team._id,
      date: new Date(),
    });

    team.posts.unshift(post._id);
    await team.save();

    const populatedPost = await Post.findById(post._id)
      .populate("author", "nomeUtente cognomeUtente");

    //Inoltro del post su Telegram, se il team è accoppiato con un gruppo Telegram
    if (team.telegramChatId) {
      const autore = populatedPost.author
      ? `${populatedPost.author.nomeUtente} ${populatedPost.author.cognomeUtente}`
      : "Un membro del team";
      const testoTelegram = `📌 Nuovo post sulla bacheca da ${autore}:\n${content}`;
      await sendTelegramMessage(team.telegramChatId, testoTelegram);
    } else {
      console.log("Attenzione! Nessun gruppo Telegram collegato al team");
    }

    res.status(201).json(populatedPost);
  } catch (err) {
    res.status(500).json({ message: "Errore nell'aggiunta del post" });
  }
};

//Eliminazione del post, solo se hai poteri di amministratore o superiore
export const deletePost = async (req, res) => {
  const { teamId, postId } = req.params;
  const userId = req.user.id;

  try {
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: "Team non trovato" });

    if (!isAdmin(team, userId)) {
      return res.status(403).json({ message: "Solo admin possono eliminare" });
    }

    const postIndex = team.posts.findIndex(id => String(id) === String(postId));
    if (postIndex === -1) {
      return res.status(404).json({ message: "Post non trovato nel team" });
    }

    team.posts.splice(postIndex, 1);
    await team.save();
    await Post.findByIdAndDelete(postId);

    res.json({ message: "Post eliminato" });
  } catch (err) {
    res.status(500).json({ message: "Errore interno server" });
  }
};


//Abbandonare un determinato team
export const leaveTeam = async (req, res) => {
  try {
    const { id: teamId } = req.params;
    const userId = req.user.id;

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: "Team non trovato" });

    const before = team.members.length;
    team.members = team.members.filter(
      (m) => String(m.user) !== String(userId)
    );

    if (team.members.length === before) {
      return res.status(404).json({ message: "Utente non trovato nel team" });
    }

    await team.save();

    console.log("Membri dopo:", team.members.map(m => m.user.toString()));
    res.json({ message: "Hai abbandonato il team" });
  } catch (err) {
    console.error("Errore abbandono team:", err);
    res.status(500).json({ message: "Errore durante l'abbandono del team" });
  }
};

//Rimuovere un membro dal team con rank inferiore al proprio
export const removeMember = async (req, res) => {
  try {
    const { teamId, memberId } = req.params;
    const userId = req.user.id;

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: "Team non trovato" });

    // Gerarchia dei ruoli
    const roleRank = {
      Creator: 3,
      Admin: 2,
      Member: 1,
    };
    // Trova chi sta rimuovendo
    const currentMember = team.members.find(
      (m) => String(m.user?._id || m.user) === String(userId)
    );
    if (!currentMember) {
      return res.status(403).json({ message: "Non fai parte del team" });
    }
    // Trova chi viene rimosso
    const targetMember = team.members.find(
      (m) => String(m.user?._id || m.user) === String(memberId)
    );
    if (!targetMember) {
      return res.status(404).json({ message: "Membro non trovato nel team" });
    }
    // Impedisci rimozione del creatore
    if (targetMember.role === "Creator") {
      return res.status(403).json({ message: "Non puoi rimuovere il creatore del team" });
    }
    // Impedisci rimozione di pari o superiore
    if (roleRank[currentMember.role] <= roleRank[targetMember.role]) {
      return res.status(403).json({ message: "Non hai i permessi per rimuovere questo membro" });
    }
    // Rimuovi il membro
    team.members = team.members.filter(
      (m) => String(m.user?._id || m.user) !== String(memberId)
    );

    await team.save();

    const updatedTeam = await Team.findById(teamId)
      .populate("members.user", "nomeUtente cognomeUtente email");

    res.json(updatedTeam);
  } catch (err) {
    res.status(500).json({ message: "Errore interno del server" });
  }
};

//UPGRADE LINK TELEGRAM
export const updateTelegramInvite = async (req, res) => {
  try {
    const { link } = req.body;
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ message: "Team non trovato" });

    if (!isAdmin(team, req.user.id)) {
      return res.status(403).json({ message: "Non sei admin" });
    }

    team.telegramInviteLink = link;
    await team.save();
    res.json({ message: "Link aggiornato" });
  } catch (err) {
    res.status(500).json({ message: "Errore interno" });
  }
};
