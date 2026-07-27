/**
 * Controlador de Autenticación - MVP Coordinador Técnico
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = require('../db');
const config = require('../config');

// Registro de usuario
const registrar = async (req, res) => {
  try {
    const { username, password, rol, id_tecnico } = req.body;

    // Verificar si existe usuario
    const existente = await prisma.usuario.findUnique({ where: { username } });
    if (existente) {
      return res.status(400).json({ error: 'Usuario ya existe' });
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    const usuario = await prisma.usuario.create({
      data: {
        username,
        password: hashedPassword,
        rol: rol || 'tecnico',
        id_tecnico: id_tecnico ? parseInt(id_tecnico) : null
      }
    });

    res.status(201).json({ message: 'Usuario creado', id: usuario.id });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
};

// Login
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const usuario = await prisma.usuario.findUnique({
      where: { username },
      include: { tecnico: true }
    });

    if (!usuario) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    const validPassword = await bcrypt.compare(password, usuario.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    const token = jwt.sign(
      { 
        id: usuario.id, 
        username: usuario.username, 
        rol: usuario.rol,
        tecnicoId: usuario.id_tecnico 
      },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN }
    );

    res.json({
      token,
      usuario: {
        id: usuario.id,
        username: usuario.username,
        rol: usuario.rol,
        tecnico: usuario.tecnico
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
};

// Obtener usuario actual
const perfil = async (req, res) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.user.id },
      include: { tecnico: true }
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({
      id: usuario.id,
      username: usuario.username,
      rol: usuario.rol,
      tecnico: usuario.tecnico
    });
  } catch (error) {
    console.error('Error en perfil:', error);
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
};

// Middleware de autenticación
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

module.exports = { registrar, login, perfil, authenticate };