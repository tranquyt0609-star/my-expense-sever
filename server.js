const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = 3000; // Node.js thường chạy cổng 3000

// Cấu hình Database PostgreSQL
const pool = new Pool({
    user: 'postgres',      // User mặc định
    host: 'localhost',
    database: 'ExpeSQL', // Tên DB bạn đã tạo trong pgAdmin
    password: '123456@',    // <--- ĐỔI THÀNH PASS CỦA BẠN
    port: 5432,
});

// Middleware để đọc JSON từ Android
app.use(cors());
app.use(express.json()); 

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
        console.log("CHI TIẾT LỖI:", err); // Dòng này sẽ in lỗi ra màn hình đen
        res.json({ status: 'fail', message: err.message }); // Dòng này gửi lỗi về điện thoại
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
        
        // Map dữ liệu để khớp với Android (Node pg trả về biến 'is_income', Android cần 'isIncome')
        const data = result.rows.map(row => ({
            id: row.id,
            amount: parseFloat(row.amount), // Chuyển string sang số
            note: row.note,
            isIncome: row.is_income // PostgreSQL trả về true/false chuẩn luôn
        }));

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. API Thêm giao dịch
app.post('/api/add_transaction', async (req, res) => {
    const { user_id, amount, note, isIncome } = req.body;
    
    // Logic: Nếu Thu (true) -> cat_id=1, Nếu Chi (false) -> cat_id=2
    // Đảm bảo bạn đã tạo category ID 1 và 2 trong pgAdmin rồi nhé
    const categoryId = isIncome ? 1 : 2;

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
    console.log(`Server Node.js đang chạy tại: http://localhost:${port}`);
});