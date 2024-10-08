//Bracket generation utility functions
const State = {
    SCHEDULED: "SCHEDULED",
    INPROGRESS: "IN-PROGRESS",
    FINISHED: "FINISHED"
  };
  
  const TBDPlayer = {
    playerId: 0,
    name: "TBD",
    handle: "TBD",
    rank: 0,
    score: 0,
    image: "",
    floor_price: 0,
    followers: 0
  };
  
  module.exports = {
  
    // Function to shuffle an array
    shuffleArray: (array) => {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Swap elements
      }
      return array;
    },
  
    // Function to select players based on filtering criteria and number of rounds
    selectPlayers: (players, numPlayers) => {
        if(Math.log2(numPlayers) % 1 !== 0) new Error('Number of players must be a power of 2')
      if (numPlayers > players.length) {
        throw new Error(
          `Provided list length (${players.length}) does not satisfy minimum required size for ${numRounds} rounds (${desiredSize}).`,
        );
      }
      return module.exports.shuffleArray(players)
      .slice(0, numPlayers).sort((a, b) => {a.followers_count - b.followers_count})
      .map((player, index) => {return { ...player, seed: index + 1 }})
  },
  
    // Function to create initial matchups based on player rankings
    matchPlayers: (players) => {
      let matchups = [];
      for (let i = 0; i < players.length / 2; i++) {
        matchups.push({
          matchId: i + 1,
          player1: players[i],
          player2: players[players.length - 1 - i]
        });
      }
      return matchups;
    },
  
    // Function to create initial matchups randomly
    matchPlayersRandomly(players) {
      let matchups = [];
      let shuffledPlayers = module.exports.shuffleArray(players);
      for (let i = 0; i < shuffledPlayers.length / 2; i++) {
        matchups.push({
          matchId: i + 1,
          player1: shuffledPlayers[i],
          player2: shuffledPlayers[shuffledPlayers.length - 1 - i]
        });
      }
      return matchups;
    },
  
    // Function to seed matchups by alternating between two halves
    seedMatchups: (matchups) => {
      if (matchups.length <= 1) return matchups;
  
      // Split matchups into two halves
      const half = Math.floor(matchups.length / 2);
      const firstHalf = module.exports.seedMatchups(matchups.slice(0, half));
      const secondHalf = module.exports.seedMatchups(matchups.slice(half));
  
      // Create new order by alternating between halves
      let seededMatchups = [];
      for (let i = 0; i < half; i++) {
        seededMatchups.push(firstHalf[i]);
        seededMatchups.push(secondHalf[i]);
      }
      return seededMatchups;
    },
  
    // Function to order matchups in the bracket
    orderBracket: (matchups) => {
      let bracket = [];
      let i = 0;
      while (matchups.length > 0) {
        i % 2 === 0 ? bracket.push(matchups.shift()) : bracket.push(matchups.pop());
        i++;
      }
      return bracket;
    },
  
    // Function to generate the entire bracket
    generateBracket: (playerlist, randomizer = false) => {
      const initialMatchups = randomizer ? module.exports.matchPlayersRandomly(playerlist) : module.exports.matchPlayers(playerlist);
      const seededMatchups = module.exports.seedMatchups(initialMatchups);
      const bracket = module.exports.orderBracket(seededMatchups);
      return module.exports.formatDataForBracket(bracket, playerlist.length);
    },
  
    // Function to format the bracket data for the tournament
    formatDataForBracket: (matchups, totalPlayers) => {
      let bracket = [];
      let totalMatches = matchups.length;
      let totalRounds = Math.ceil(Math.log2(totalPlayers)); // Calculate total rounds needed for the tournament
  
      // Initially push all first-round matchups
      matchups.forEach((matchup, index) => {
        bracket.push({
          matchId: matchup.matchId,
          nextMatchId: Math.ceil((index + 1) / 2) + totalMatches,
          round: 1,
          participants: [matchup.player1, matchup.player2],
          state: State.SCHEDULED
        });
      });
  
      let currentMatches = totalMatches;
      let matchIdCounter = totalMatches;
  
      // Generate subsequent rounds
      for (let round = 2; round <= totalRounds; round++) {
        let nextRoundMatches = Math.floor(currentMatches / 2);
        for (let i = 0; i < nextRoundMatches; i++) {
          matchIdCounter++;
          let isFinal = round === totalRounds && i === nextRoundMatches - 1;
          bracket.push({
            matchId: matchIdCounter,
            nextMatchId: isFinal ? null : Math.ceil(matchIdCounter / 2) + totalMatches,
            round,
            participants: [TBDPlayer, TBDPlayer],
            state: State.SCHEDULED
          });
        }
        currentMatches = nextRoundMatches;
      }
  
      return bracket;
    },
  };
  