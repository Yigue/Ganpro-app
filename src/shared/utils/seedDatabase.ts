import { database } from '@data/database/database';
import { Q } from '@nozbe/watermelondb';
import { addDays, subDays, subMonths } from 'date-fns';

/**
 * SeedDatabase - Inyecta una simulación completa de un establecimiento ganadero profesional.
 * Carga Animales, Potreros, Sanidad, Nutrición y Finanzas.
 */
export async function seedDatabase() {
  console.log('[Seed] Iniciando carga de datos mock...');

  await database.write(async () => {
    // 1. Limpiar datos previos (Opcional, pero recomendado para una demo limpia)
    // Descomentar si querés un reset total:
    // await database.unsafeResetDatabase(); 

    // 2. Crear Potreros
    const potreros = [
      { id: 'p1', nombre: 'El Bajo', ha: 50, recurso: 'ALFALFA' },
      { id: 'p2', nombre: 'La Loma', ha: 120, recurso: 'PASTURA_NATURAL' },
      { id: 'p3', nombre: 'El Sauce', ha: 30, recurso: 'VERDEO_INVIERNO' },
      { id: 'p4', nombre: 'Corral 1', ha: 2, recurso: 'CORRAL' },
    ];

    const createdPotreros = [];
    for (const p of potreros) {
      const record = await database.get('potreros').create((row: any) => {
        row._raw.id = p.id;
        row.nombre = p.nombre;
        row.hectareas = p.ha;
        row.recursoForrajero = p.recurso;
      });
      createdPotreros.push(record);
    }

    // 3. Crear Lotes
    const lote = await database.get('lotes').create((row: any) => {
      row.nombre = 'Lote Invernada Pro';
      row.color = '#00D68F';
    });

    // 4. Crear Animales (100 cabezas)
    const categorias = ['Vaca', 'Novillo', 'Ternero', 'Vaquillona'];
    const razas = ['Angus', 'Hereford', 'Braford'];
    
    for (let i = 1; i <= 100; i++) {
      await database.get('animals').create((row: any) => {
        row.idCaravana = `GP-${String(i).padStart(4, '0')}`;
        row.categoria = categorias[i % categorias.length];
        row.raza = razas[i % razas.length];
        row.sexo = i % 3 === 0 ? 'M' : 'H';
        row.estado = 'ACTIVO';
        row.loteId = lote.id;
        row.potreroId = i <= 40 ? 'p1' : i <= 80 ? 'p2' : 'p3'; // Repartidos
      });
    }

    // 5. Vademécum (Catálogo)
    const op1 = await database.get('operations_catalog').create((row: any) => {
      row.nombre = 'Aftosa - Campaña Anual';
      row.tipo = 'VACUNA';
      row.diasCarencia = 30;
      row.notas = JSON.stringify({ dosis: '2ml', duracion: 1 });
    });

    const op2 = await database.get('operations_catalog').create((row: any) => {
      row.nombre = 'Ivermectina 1%';
      row.tipo = 'ANTIPARASITARIO';
      row.diasCarencia = 45;
      row.notas = JSON.stringify({ dosis: '1ml/50kg', duracion: 1 });
    });

    // 6. Programación Sanitaria (Calendario)
    // Una tarea realizada (ayer), una para hoy, una para la semana que viene
    const dates = [subDays(new Date(), 1), new Date(), addDays(new Date(), 5)];
    for (let i = 0; i < dates.length; i++) {
      await database.get('scheduled_operations').create((row: any) => {
        row.operationId = i === 0 ? op2.id : op1.id;
        row.loteId = lote.id;
        row.fechaProgramada = dates[i].getTime();
        row.estado = i === 0 ? 'COMPLETADO' : 'PENDIENTE';
      });
    }

    // 7. Suplementos (Stock)
    const sup1 = await database.get('suplementos').create((row: any) => {
      row.nombre = 'Maíz Entero';
      row.tipo = 'MAIZ';
      row.materiaSecaPct = 85;
      row.precioPorTonelada = 180000;
      row.stockKg = 5000;
    });

    const sup2 = await database.get('suplementos').create((row: any) => {
      row.nombre = 'Expeller Soja';
      row.tipo = 'PELLET';
      row.materiaSecaPct = 90;
      row.precioPorTonelada = 320000;
      row.stockKg = 2000;
    });

    // 8. Raciones
    const racion = await database.get('raciones').create((row: any) => {
      row.nombre = 'Mezcla Engorde Verano';
      row.descripcion = 'Costo: $240/kg';
      row.activa = true;
    });

    // Relación Ración-Ingredientes (NUEVA TABLA)
    await database.get('racion_ingredientes').create((row: any) => {
      row.racionId = racion.id;
      row.suplementoId = sup1.id;
      row.porcentaje = 70;
      row.cantidadKgPorTonelada = 700;
    });

    // 9. Finanzas (Categorías y Movimientos)
    const catGasto = await database.get('financial_categories').create((row: any) => {
      row.name = 'Insumos';
      row.type = 'EXPENSE';
      row.color = '#FF3D71';
    });

    const catIngreso = await database.get('financial_categories').create((row: any) => {
      row.name = 'Venta Terneros';
      row.type = 'INCOME';
      row.color = '#00D68F';
    });

    // Movimientos de los últimos 3 meses
    for (let i = 0; i < 6; i++) {
      await database.get('movimientos_financieros').create((row: any) => {
        row.tipo = i % 2 === 0 ? 'GASTO' : 'INGRESO';
        row.monto = i % 2 === 0 ? 50000 * (i+1) : 250000 * (i+1);
        row.categoria = i % 2 === 0 ? 'Insumos' : 'Venta Terneros';
        row.fecha = subMonths(new Date(), i).getTime();
        row.descripcion = i % 2 === 0 ? 'Compra Alimento' : 'Venta a Frigorífico';
      });
    }

    // 10. Condición Corporal e Historial de Peso (Eventos)
    for (let i = 0; i < 5; i++) {
      await database.get('condicion_corporal').create((row: any) => {
        row.loteId = lote.id;
        row.score = 3 + (i * 0.1);
        row.fecha = subMonths(new Date(), i).getTime();
      });
      
      // Pesajes mock para el gráfico GDP
      await database.get('eventos').create((row: any) => {
        row.animalId = 'GP-0001'; // Referencia a uno
        row.tipo = 'PESAJE';
        row.valor = 300 + (i * 20);
        row.timestamp = subMonths(new Date(), 4 - i).getTime();
      });
    }
  });

  console.log('[Seed] ¡Base de datos poblada con éxito!');
}
