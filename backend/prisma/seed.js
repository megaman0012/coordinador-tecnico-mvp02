const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de datos...');

  // Crear técnicos
  const tecnicos = [
    { nombre: 'Juan Pérez', cedula: '12345678', telefono: '0991234567', email: 'juan@empresa.com', especialidad: 'Refrigeración' },
    { nombre: 'María González', cedula: '87654321', telefono: '0987654321', email: 'maria@empresa.com', especialidad: 'Electricidad' },
    { nombre: 'Pedro Rodríguez', cedula: '11223344', telefono: '0977112233', email: 'pedro@empresa.com', especialidad: 'Mantenimiento General' },
    { nombre: 'Carlos López', cedula: '55667788', telefono: '0966556677', email: 'carlos@empresa.com', especialidad: 'Aire Acondicionado' },
    { nombre: 'Ana Martínez', cedula: '99887766', telefono: '0955998877', email: 'ana@empresa.com', especialidad: 'Electrónica' },
    { nombre: 'Luis García', cedula: '44556677', telefono: '0944556677', email: 'luis@empresa.com', especialidad: 'Plomería' },
    { nombre: 'Sofia Hernández', cedula: '33224455', telefono: '0933224455', email: 'sofia@empresa.com', especialidad: 'Redes y Telecomunicaciones' },
    { nombre: 'Jorge Díaz', cedula: '22113344', telefono: '0922113344', email: 'jorge@empresa.com', especialidad: 'Bombas y Motores' }
  ];

  const tecnicosCreados = [];
  for (const t of tecnicos) {
    const tecnico = await prisma.tecnico.upsert({
      where: { cedula: t.cedula },
      update: {},
      create: { ...t, estado: 'activo', jornada_horaria: 8 }
    });
    tecnicosCreados.push(tecnico);
    console.log(`✓ Técnico: ${tecnico.nombre}`);
  }

  // Crear clientes
  const clientes = [
    { nombre: 'Supermercado Central', ruc: '80012345-7', telefono: '021234567', email: 'contacto@supermercadocentral.com', direccion: 'Av. Principal 123' },
    { nombre: 'Centro Comercial Plaza', ruc: '80023456-7', telefono: '021345678', email: 'admin@plazashop.com', direccion: 'Av. Comercial 456' },
    { nombre: 'Hospital Regional', ruc: '80034567-7', telefono: '021456789', email: 'mantenimiento@hospitalregional.gov', direccion: 'Av. Salud 789' },
    { nombre: 'Hotel Paradise', ruc: '80045678-7', telefono: '021567890', email: 'servicios@hotelparadise.com', direccion: 'Av. Turística 321' },
    { nombre: 'Industrias del Norte', ruc: '80056789-7', telefono: '021678901', email: 'mantenimiento@industriasnorte.com', direccion: 'Ruta 5 Km 45' }
  ];

  const clientesCreados = [];
  for (const c of clientes) {
    const cliente = await prisma.cliente.upsert({
      where: { ruc: c.ruc },
      update: {},
      create: { ...c, estado: 'activo' }
    });
    clientesCreados.push(cliente);
    console.log(`✓ Cliente: ${cliente.nombre}`);
  }

  // Crear locales para cada cliente
  const localesCreados = [];
  for (const cliente of clientesCreados) {
    const locales = [
      { nombre: `${cliente.nombre} - Matriz`, direccion: cliente.direccion, ciudad: 'Asunción' },
      { nombre: `${cliente.nombre} - Sucursal Norte`, direccion: `${cliente.direccion} Norte`, ciudad: 'Ciudad del Este' },
      { nombre: `${cliente.nombre} - Sucursal Sur`, direccion: `${cliente.direccion} Sur`, ciudad: 'Encarnación' }
    ];
    for (const l of locales) {
      const local = await prisma.local.create({
        data: { ...l, id_cliente: cliente.id, estado: 'activo' }
      });
      localesCreados.push(local);
    }
  }
  console.log(`✓ ${localesCreados.length} locales creados`);

  // Crear órdenes
  const tipos = ['visita_tecnica', 'correctivo', 'preventivo', 'instalacion'];
  const prioridades = ['baja', 'media', 'alta', 'urgente'];
  const estados = ['pendiente', 'en_proceso', 'completada', 'no_cumplida', 'reprogramada'];

  const ordenes = [];
  for (let i = 1; i <= 20; i++) {
    const cliente = clientesCreados[Math.floor(Math.random() * clientesCreados.length)];
    const local = localesCreados.filter(l => l.id_cliente === cliente.id)[0];
    const tipo = tipos[Math.floor(Math.random() * tipos.length)];
    const prioridad = prioridades[Math.floor(Math.random() * prioridades.length)];
    const estado = estados[Math.floor(Math.random() * estados.length)];
    
    const fechaProgramada = new Date();
    fechaProgramada.setDate(fechaProgramada.getDate() + Math.floor(Math.random() * 30) - 15);
    
    const orden = await prisma.orden.create({
      data: {
        numero_orden: `ORD-2026-${String(i).padStart(4, '0')}`,
        id_cliente: cliente.id,
        id_local: local.id,
        tipo_trabajo: tipo,
        prioridad: prioridad,
        estado: estado,
        descripcion: `Trabajo de ${tipo} - Prioridad ${prioridad}`,
        fecha_programada: fechaProgramada,
        horas_estimadas: Math.floor(Math.random() * 4) + 1,
        cantidad_tecnicos: 1,
        facturable: Math.random() > 0.5,
        estado_facturacion: estado === 'completada' ? 'planificada' : 'no_iniciada',
        informe_adjunto: estado === 'completada' && Math.random() > 0.5,
        estado_informe: estado === 'completada' ? 'enviado' : 'pendiente'
      }
    });
    ordenes.push(orden);
  }
  console.log(`✓ ${ordenes.length} órdenes creadas`);

  // Crear asignaciones
  for (const orden of ordenes.slice(0, 15)) {
    const fechaAsignacion = orden.fecha_programada || new Date();
    const tecnico = tecnicosCreados[Math.floor(Math.random() * tecnicosCreados.length)];
    await prisma.asignacion.create({
      data: {
        id_orden: orden.id,
        id_tecnico: tecnico.id,
        fecha_asignacion: fechaAsignacion,
        hora_inicio_programada: '08:00',
        hora_fin_programada: '12:00',
        estado: orden.estado === 'completada' ? 'completado' : 'pendiente'
      }
    });
  }
  console.log('✓ Asignaciones creadas');

  // Crear horas registradas
  for (const tecnico of tecnicosCreados) {
    for (let d = 0; d < 10; d++) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - d);
      
      await prisma.horaTecnico.create({
        data: {
          id_tecnico: tecnico.id,
          id_orden: ordenes[Math.floor(Math.random() * ordenes.length)].id,
          fecha: fecha,
          hora_inicio: '08:00',
          hora_fin: '17:00',
          horas_trabajadas: 8,
          tipo: d % 7 === 0 || d % 7 === 6 ? 'extra' : 'normal',
          es_fin_semana: d % 7 === 0 || d % 7 === 6
        }
      });
    }
  }
  console.log('✓ Horas registradas');

  // Crear usuarios
  const password = await bcrypt.hash('123456', 10);
  
  await prisma.usuario.upsert({
    where: { username: 'admin' },
    update: {},
    create: { username: 'admin', password, rol: 'admin', estado: 'activo' }
  });
  console.log('✓ Admin: admin / 123456');

  await prisma.usuario.upsert({
    where: { username: 'coordinador' },
    update: {},
    create: { username: 'coordinador', password, rol: 'coordinador', estado: 'activo' }
  });
  console.log('✓ Coordinador: coordinador / 123456');

  for (const t of tecnicosCreados) {
    await prisma.usuario.upsert({
      where: { username: t.nombre.toLowerCase().replace(' ', '') },
      update: {},
      create: { 
        username: t.nombre.toLowerCase().replace(' ', ''), 
        password, 
        rol: 'tecnico', 
        id_tecnico: t.id,
        estado: 'activo' 
      }
    });
  }
  console.log('✓ Usuarios de técnicos creados');

  console.log('\n🎉 Seed completado exitosamente!');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());