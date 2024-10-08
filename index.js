const express = require("express");
const cors = require("cors");
const fs = require("fs");
const { authenticate, adminAuth } = require("./utils/auth-utils");
const { fetchAllHeroInfo, fetchAllHeroes } = require("./utils/fantasy-utils");
const { generateBracket, selectPlayers } = require("./utils/bracket-utils");
const {db, Timestamp} = require("./utils/database-utils");

const app = express();
const port = process.env.PORT

app.use(cors());
app.use(express.json());

app.post("/tournament/create", async (req, res) => {
    try {
      const { numPlayers, startDate = (Date.now() + 84600 * 3 * 1000), endDate = (Date.now() + 86400 * 30 * 1000) } = req.body;    
      const { heroes } = await fetchAllHeroes(false, "HERO");
      if (!!heroes.length) {
        const selectedPlayers = selectPlayers(heroes, numPlayers);
        const currentSelectedPlayers = selectedPlayers.map((player) => ({
          name: player.name || "Error",
          handle: player.handle || "Error",
          seed: player.seed || 0,
          image: player.profile_image_url_https || "",
          followers: player.followers_count || 0,
        }));
        db.collection("tournaments").add({
          participants: currentSelectedPlayers,
          startDate: Timestamp.fromMillis(startDate),
          endDate: Timestamp.fromMillis(endDate),
          status: "UPCOMING",
        }).then((docRef) => {
          console.log(docRef.id);
          res.json({ success: true, tournamentId: docRef.id, selectedPlayers: currentSelectedPlayers });
        });
      } else {
        res.json({ error: "Hero list is empty" });
      }
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: error.message });
    }
  }
);

app.post("/tournament/:id/generateMatchups", async (req, res) => {
  const tournamentRef = await db.collection("tournaments").doc(req.params.id).get();
  const tournament = tournamentRef.data();
  const bracket = generateBracket(tournament.participants, false);
  db.collection("tournaments").doc(req.params.id).update({ matchups: bracket });
  res.json({ bracket });
});

app.get("/tournament/:id/matchups", async (req, res) => {
  const tournamentRef = await db.collection("tournaments").doc(req.params.id).get();
  const tournament = tournamentRef.data();
  res.json({ matchups: tournament.matchups });
});

app.post("/tournament/:id/saveNewBracket", async (req, res) => {
  const { selections } = req.body;
  // const { user } = req;
  const user = {
    twitter: {
      id: "123456789",
    },
  }
  const tournamentRef = await db.collection("tournaments").doc(req.params.id).get();
  const tournament = tournamentRef.data();
  if (tournament.status !== "UPCOMING") {
    return res.json({ error: "This tournament is no longer accepting brackets"});
  }
    db.collection("tournaments")
    .doc(req.params.id)
    .collection("brackets")
    .doc(user.twitter.id)
    .create({selections, lastUpdated: Timestamp.now() })
    .then(() => res.json({ success: true }))
    .catch((error) => {
      if(error.code === 6) {
        res.json({ error: "Bracket already exists" });
      } else {
        res.json({ error: error.message });
      }
    });
});

app.post("/tournament/:id/saveExistingBracket", async (req, res) => {
  console.log(req.body);
  const { selections } = req.body;
  // const { user } = req;
  const user = {
    twitter: {
      id: "1234567891011",
    },
  }
  const tournamentRef = await db.collection("tournaments").doc(req.params.id).get();
  const tournament = tournamentRef.data();
  if (tournament.status !== "UPCOMING") {
    return res.json({ error: "Brackets for this tournament are now locked" });
  }
  db.collection("tournaments")
  .doc(req.params.id)
  .collection("brackets")
    .doc(user.twitter.id)
    .update({selections, lastUpdated: Timestamp.now() })
    .then(() => res.json({ success: true }))
    .catch((error) => {
      if(error.code === 5) {
        res.json({ error: "Bracket does not exist" });
      } else {
        res.json({ error: error.message });
      }
    });
});

app.listen(port, () => console.log(`listening on port ${port}`));
