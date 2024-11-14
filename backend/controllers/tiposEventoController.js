const pool = require('../database')

const getTiposEvento = async (req, res) => {
    try {
        const [tipos] = await pool.query('SELECT * FROM tipo_evento ORDER BY nombre')
        res.json(tipos)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

const createTipoEvento = async (req, res) => {
    try {
        const { nombre, color, afecta_prediccion, factor_ajuste } = req.body
        const [result] = await pool.query(
            `INSERT INTO tipo_evento (nombre, color, afecta_prediccion, factor_ajuste) 
             VALUES (?, ?, ?, ?)`,
            [nombre, color, afecta_prediccion, factor_ajuste]
        )
        res.json({ 
            tipo_id: result.insertId,
            message: 'Tipo de evento creado exitosamente' 
        })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

const updateTipoEvento = async (req, res) => {
    try {
        const { id } = req.params
        const { nombre, color, afecta_prediccion, factor_ajuste } = req.body
        
        await pool.query(
            `UPDATE tipo_evento 
             SET nombre = ?, color = ?, afecta_prediccion = ?, factor_ajuste = ?
             WHERE tipo_id = ?`,
            [nombre, color, afecta_prediccion, factor_ajuste, id]
        )
        
        res.json({ message: 'Tipo de evento actualizado exitosamente' })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

module.exports = {
    getTiposEvento,
    createTipoEvento,
    updateTipoEvento
}
