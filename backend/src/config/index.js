import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const connectDB = async () => {
    try {    
        const client = await pool.connect();
        const result = await client.query("SELECT current_database()");
        console.log(`PostgreSQL connected! DB: ${result.rows[0].current_database}`);
        client.release();
    } catch (error) {
        console.log("PostgreSQL connection error:", error);
        process.exit(1);
    }
};

export { pool };
export default connectDB;