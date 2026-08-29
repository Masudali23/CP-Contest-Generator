import {
    createContestDb,
    getContestByIdDb,
    endContestDb,
    getUserContestHistoryDb,
    createContestReportDb,
    getContestReportByIdDb,
    deleteContestReportDb,
} from "../db/contest.db.js";

export const createContest = (contest) => createContestDb(contest);
export const getContestById = (contestId) => getContestByIdDb(contestId);
export const endContestById = (contestId) => endContestDb(contestId);
export const getUserContestHistory = (userId) => getUserContestHistoryDb(userId);
export const createContestReport = (report) => createContestReportDb(report);
export const getContestReportById = (contestId) => getContestReportByIdDb(contestId);
export const deleteContestReport = (contestId) => deleteContestReportDb(contestId);
