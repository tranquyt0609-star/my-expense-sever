const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
// Render sẽ tự cấp cổng qua biến môi trường, nếu không thì dùng 3000
const port = process.env.PORT || 3000;

// === CẤU HÌNH DATABASE CHUẨN CHO CLOUD ===
const pool = new Pool({
    // Lấy đường link kết nối từ biến môi trường trên Render
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Bắt buộc phải có dòng này khi dùng Neon
    }
});

// Middleware
app.use(cors());
app.use(express.json()); 

app.get('/', (req, res) => {
    res.send("Server đang chạy thành công!");
});

// 1. API Đăng nhập
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query(
            'SELECT id, username, full_name FROM users WHERE username = $1 AND password = $2',
            [username, password]
        );
        if (result.rows.length > 0) {
            res.json({ status: 'success', data: result.rows[0] });
        } else {
            res.json({ status: 'fail', message: 'Sai tài khoản hoặc mật khẩu' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. API Đăng ký
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    const fullName = "Thành Viên Mới";
    try {
        await pool.query(
            'INSERT INTO users (username, password, full_name) VALUES ($1, $2, $3)',
            [username, password, fullName]
        );
        res.json({ status: 'success', message: 'Đăng ký thành công' });
   } catch (err) {
        console.log("CHI TIẾT LỖI:", err);
        res.json({ status: 'fail', message: err.message });
    }
});

// 3. API Lấy danh sách giao dịch
app.get('/api/get_transactions', async (req, res) => {
    const userId = req.query.user_id;
    try {
        const query = `
            SELECT t.id, t.amount, t.note, c.type as is_income
            FROM transactions t
            JOIN categories c ON t.category_id = c.id
            WHERE t.user_id = $1
            ORDER BY t.id DESC
        `;
        const result = await pool.query(query, [userId]);
        
        const data = result.rows.map(row => ({
            id: row.id,
            amount: parseFloat(row.amount),
            note: row.note,
            isIncome: row.is_income
        }));

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. API Thêm giao dịch
app.post('/api/add_transaction', async (req, res) => {
    const { user_id, amount, note, isIncome } = req.body;
    // ID 1 là Lương (Thu), ID 4 là Ăn uống (Chi) - Theo SQL trên Neon
    const categoryId = isIncome ? 1 : 4;

    try {
        await pool.query(
            'INSERT INTO transactions (user_id, category_id, amount, note) VALUES ($1, $2, $3, $4)',
            [user_id, categoryId, amount, note]
        );
        res.json({ status: 'success' });
    } catch (err) {
        res.json({ status: 'fail', message: err.message });
    }
});

// Chạy Server
app.listen(port, () => {
    console.log(`Server Node.js đang chạy tại cổng: ${port}`);
});