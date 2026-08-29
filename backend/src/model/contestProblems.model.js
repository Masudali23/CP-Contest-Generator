import { createContestProblemsDb, getContestProblemsDb } from "../db/contestProblems.db.js";

const createContestProblems = async (problems) => {
    try {
        return await createContestProblemsDb(problems);
    } catch (error) {
        throw new Error("error creating problems");
    }
}

const getContestProblemsById = async (contestId) => {    
    try {
        return await getContestProblemsDb(contestId);
    } catch (error) {
        throw new Error("error getting problems");
    }
}

export {createContestProblems, getContestProblemsById};