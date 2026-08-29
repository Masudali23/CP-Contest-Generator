import { createContestProblemsDb, getContestProblemsDb } from "../db/contestProblems.db.js";

export const createContestProblems = (problems) => createContestProblemsDb(problems);
export const getContestProblemsById = (contestId) => getContestProblemsDb(contestId);
