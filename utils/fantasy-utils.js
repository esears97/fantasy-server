//Fantasy API functions
const fs = require("node:fs");
require("dotenv").config();
const { db } = require("./database-utils");

const fetchAllHeroes = async (forceUpdate = false, heroFilter = "HERO") => {
  //Gets a list of all heroes from the fantasy API
  console.log("Fetching hero list");
  //Get list of users who want to be excluded from bracket
  const exclusionsDoc = await db.collection("data").doc("exclusions").get();
  const exclusions = exclusionsDoc.exists
    ? Object.keys(exclusionsDoc.data().users).filter(
        (userId) => exclusionsDoc.data().users[userId] === true
      )
    : [];
  let currListDoc = await db.collection("data").doc("heroes").get();
  if (currListDoc.exists) {
    let currList = currListDoc.exists ? currListDoc.data() : {};

    if (
      currList.lastUpdate > Date.now() - 24 * 60 * 60 * 1000 &&
      forceUpdate === false
    ) {
      //If list is less than 24 hours old, returns the most recent list
      //Can override the 24 hour limit by setting forceUpdate to true
      currList.heroes = currList.heroes.filter(
        (hero) => hero.status === heroFilter && !exclusions.includes(hero.id)
      );
      return currList;
    }
  }

  try {
    //If list is older than 24 hours, fetches a new list
    console.log(`Updating list of heroes...`);
    //Need to run in batches of 50 to avoid rate limiting
    const runBatch = async (limit, skip) => {
      const data = await fetch(
        `${process.env.API_URL}/hero?$limit=${limit}&$skip=${skip}`,
        {
          method: "GET",
          headers: {
            "content-Type": "application/json",
            "x-api-key": process.env.FANTASY_API_KEY,
          },
        }
      );
      const res = await data.json();
      return res;
      //With the addition of tactics, we want to filter out any non-heroes and people who want to be excluded.
    };

    let batch = await runBatch(50, 0);
    let total = batch.total;
    let heroes = batch.data;

    for (let i = heroes.length; i < total; i += 50) {
      let res = await runBatch(50, i);
      heroes = heroes.concat(res.data);
      console.log(`${heroes.length}/${total}`);
    }
    console.log(`Update finished`);
    heroes = heroes.filter(
      (hero) => hero.status === heroFilter && !exclusions.includes(hero.id)
    );
    const heroList = {
      lastUpdate: Date.now(),
      heroes,
      total: heroes.length,
    };
    db.collection("data").doc("heroes").set(heroList);
    return heroList;
  } catch (error) {
    console.log(error.message);
  }
};

const fetchAllHeroInfo = async () => {
  //this will obtain fantasy info for each hero
  let herolistRef = await db.collection("data").doc("heroes").get();
  if (!herolistRef.exists) {
    throw new Error("No hero list found");
  }
  let herolist = herolistRef.data();
  if (herolist.lastUpdate < Date.now() - 24 * 60 * 60 * 1000) {
    herolist = await fetchAllHeroes(true);
  }
  const heroesInfo = await fetchMultHeroesInfo(
    herolist.heroes.map((hero) => hero.id)
  );
  return heroesInfo;
};

const fetchMultHeroesInfo = async (heroIds = []) => {
  //Fetches info for multiple heroes, useful for fetching only active bracket participants
  const heroesInfo = {};
  if (heroIds.length === 0) {
    console.log("No hero IDs provided");
    return;
  }
  console.log(`Updating info for ${heroIds.length} heroes...`);
  let success = 0;
  let failure = 0;
  for (const [index, id] of heroIds) {
    console.log(`${index + 1}/${heroIds.length}`);
    try {
      const data = await fetch(`${process.env.API_URL}/hero/${id}`, {
        method: "GET",
        headers: {
          "content-Type": "application/json",
          "x-api-key": process.env.FANTASY_API_KEY,
        },
      });

      const heroInfo = await data.json();
      db.collection("hero_info")
        .doc(id)
        .set({ lastUpdated: Date.now(), info: heroInfo });
      success++;
      heroesInfo[id] = heroInfo;
    } catch (error) {
      console.error(`Failed to fetch hero ${id}:`, error);
      failure++;
    }

    //Due to our 30 requests per minute limit, we need to wait ~2 seconds between requests
    await new Promise((resolve) => setTimeout(resolve, 2100));
  }
  console.log(
    `Update finished with ${success} successes and ${failure} failures`
  );
  return heroesInfo;
};

module.exports = { fetchAllHeroes, fetchAllHeroInfo, fetchMultHeroesInfo };
