import { Request, Response } from 'express';
import { pool } from '../conf/dbConnection';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

// Validaciones estrictas
const validateId = (id: string): number | null => {
    const parsedId = Number(id);
    return (Number.isInteger(parsedId) && parsedId > 0) ? parsedId : null;
};

const validatePrice = (price: unknown): number | null => {
    if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) return null;
    if (!Number.isInteger(price * 100)) return null; 
    return price;
};

const validateStock = (stock: unknown): number | null => {
    if (typeof stock !== 'number' || !Number.isInteger(stock) || stock < 0) return null;
    return stock;
};

const isNonEmptyString = (value: unknown): value is string => {
    return typeof value === 'string' && value.trim().length > 0;
};

export const getAllProducts = async (req: Request, res: Response): Promise<void> => {
    try {
        const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM products WHERE active = TRUE');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

export const getProductById = async (req: Request, res: Response): Promise<void> => {
    const id = validateId(req.params.id as string);
    if (!id) {
        res.status(400).json({ error: 'ID inválido. Debe ser un entero positivo.' });
        return;
    }

    try {
        const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT * FROM products WHERE id = ? AND active = TRUE', [id]
        );
        if (rows.length === 0) {
            res.status(404).json({ error: 'Producto no encontrado o inactivo.' });
            return;
        }
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

export const createProduct = async (req: Request, res: Response): Promise<void> => {
    const { name, price, stock, description, brand, img } = req.body;

    const validPrice = validatePrice(price);
    const validStock = validateStock(stock);

    if (!isNonEmptyString(name) || !isNonEmptyString(description) || validPrice === null || validStock === null) {
        res.status(400).json({ error: 'Datos inválidos. Verifica name, price, stock y description.' });
        return;
    }

    try {
        const [result] = await pool.query(
            'INSERT INTO products (name, price, stock, description, brand, img) VALUES (?, ?, ?, ?, ?, ?)',
            [name.trim(), validPrice, validStock, description.trim(), brand ?? null, img ?? null]
        ) as [ResultSetHeader, any];
        
        res.status(201).json({ message: 'Producto creado exitosamente.', insertId: result.insertId });
    } catch (error) {
        res.status(500).json({ error: 'Error interno al crear producto.' });
    }
};

export const updateProduct = async (req: Request, res: Response): Promise<void> => {
    const id = validateId(req.params.id as string);
    if (!id) {
        res.status(400).json({ error: 'ID inválido.' });
        return;
    }

    const { name, price, stock, description, brand, img } = req.body;
    const validPrice = validatePrice(price);
    const validStock = validateStock(stock);

    if (!isNonEmptyString(name) || !isNonEmptyString(description) || validPrice === null || validStock === null) {
        res.status(400).json({ error: 'Datos inválidos o faltantes.' });
        return;
    }

    try {
        const [result] = await pool.query(
            'UPDATE products SET name = ?, price = ?, stock = ?, description = ?, brand = ?, img = ? WHERE id = ? AND active = TRUE',
            [name.trim(), validPrice, validStock, description.trim(), brand ?? null, img ?? null, id]
        ) as [ResultSetHeader, any];

        if (result.affectedRows === 0) {
            res.status(404).json({ error: 'Producto no encontrado o inactivo.' });
            return;
        }
        res.json({ message: 'Producto actualizado exitosamente.' });
    } catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
    const id = validateId(req.params.id as string);
    if (!id) {
        res.status(400).json({ error: 'ID inválido.' });
        return;
    }

    try {
        const [result] = await pool.query(
            'UPDATE products SET active = FALSE WHERE id = ? AND active = TRUE', [id]
        ) as [ResultSetHeader, any];

        if (result.affectedRows === 0) {
            res.status(404).json({ error: 'Producto no encontrado o ya estaba inactivo.' });
            return;
        }
        res.json({ message: 'Producto dado de baja lógicamente.' });
    } catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

export const changeProductPrice = async (req: Request, res: Response): Promise<void> => {
    const id = validateId(req.params.id as string);
    if (!id) {
        res.status(400).json({ error: 'ID inválido.' });
        return;
    }

    const bodyKeys = Object.keys(req.body);
    if (bodyKeys.length !== 1 || bodyKeys[0] !== 'price') {
        res.status(400).json({ error: 'El cuerpo debe contener única y exclusivamente la propiedad price.' });
        return;
    }

    const validPrice = validatePrice(req.body.price);
    if (validPrice === null) {
        res.status(400).json({ error: 'Precio inválido. Debe ser numérico, mayor que 0 y máximo 2 decimales.' });
        return;
    }

    try {
        const [result] = await pool.query(
            'UPDATE products SET price = ? WHERE id = ? AND active = TRUE',
            [validPrice, id]
        ) as [ResultSetHeader, any];

        if (result.affectedRows === 0) {
            res.status(404).json({ error: 'Producto no encontrado o inactivo.' });
            return;
        }
        res.json({ message: 'Precio actualizado exitosamente.' });
    } catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};