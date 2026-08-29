import { createContestDb, createContestReportDb, endContestDb, getContestByIdDb, getContestReportByIdDb, getUserContestHistoryDb } from "../db/contest.db.js";

const createContest = async (contest) => {
    try {
        return await createContestDb(contest);
    } catch (error) {
        throw new Error("Error creating contest");
    }
}   

const getContestById = async (contestId) => {
    try {
        return await getContestByIdDb(contestId);
    } catch (error) {
        throw new Error("Error getting contest");
    }
}

const endContestById = async (contestId) => {
    try {
        return await endContestDb(contestId);
    } catch (error) {
        throw new Error("Error ending contest");
    }
}

const getUserContestHistory = async (userId) => {
    try {
        return await getUserContestHistoryDb(userId);
    } catch (error) {
        throw new Error("Error getting contest history");
    }
}

const createContestReport = async (report) => {
    try {
        return await createContestReportDb(report);
    } catch (error) {
        throw new Error("Error creating contest report");
    }
}

const getContestReportById = async (contestId) => {
    try {
        return await getContestReportByIdDb(contestId);
    } catch (error) {
        throw new Error("Error fetching contest report");
    }
}

export {createContest, getContestById, endContestById, getUserContestHistory, createContestReport, getContestReportById};