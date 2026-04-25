import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import type AnimalModel from '@data/models/AnimalModel';

export class ExportService {
  static async exportDatabaseBackup(): Promise<void> {
    if (!(await Sharing.isAvailableAsync())) {
      throw new Error('El dispositivo no soporta compartir archivos.');
    }

    const dbNames = ['watermelon', 'watermelon.db'];
    let dbPath = '';
    let found = false;

    // Rutas probables según la plataforma y la versión de RN/Watermelon
    const basePaths = Platform.OS === 'ios'
      ? [`${FileSystem.documentDirectory}../Library/Application Support/`]
      : [`${FileSystem.documentDirectory}../databases/`, `${FileSystem.documentDirectory}SQLite/`];

    for (const basePath of basePaths) {
      for (const name of dbNames) {
        const path = `${basePath}${name}`;
        try {
          const fileInfo = await FileSystem.getInfoAsync(path);
          if (fileInfo.exists) {
            dbPath = path;
            found = true;
            break;
          }
        } catch (e) {
          // Ignorar permisos de carpetas inexistentes
        }
      }
      if (found) break;
    }

    if (!found) {
      throw new Error('No se pudo localizar el archivo de la base de datos para exportar.');
    }

    // Copiamos a caché con un nombre amigable antes de compartir
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const tempPath = `${FileSystem.cacheDirectory}GanPro_Backup_${timestamp}.db`;
    
    await FileSystem.copyAsync({ from: dbPath, to: tempPath });

    await Sharing.shareAsync(tempPath, {
      mimeType: 'application/x-sqlite3',
      dialogTitle: 'Backup GanPro DB',
      UTI: 'public.database'
    });
  }

  static async exportInventoryToCSV(animals: AnimalModel[]): Promise<void> {
    if (!(await Sharing.isAvailableAsync())) {
      throw new Error('El dispositivo no soporta compartir archivos.');
    }

    // Cabeceras del CSV
    const headers = ['Caravana', 'Categoria', 'Raza', 'Sexo', 'Estado', 'Fecha Ingreso'];
    
    // Armado de filas
    const rows = animals.map(a => [
      a.idCaravana,
      a.categoria,
      a.raza || 'S/D',
      a.sexo,
      a.estado,
      new Date(a.fechaIngreso).toLocaleDateString()
    ].map(field => `"${field}"`).join(',')); // Encerramos en comillas para evitar quilombos con comas internas

    const csvContent = [headers.join(','), ...rows].join('\n');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const tempPath = `${FileSystem.cacheDirectory}Inventario_GanPro_${timestamp}.csv`;

    await FileSystem.writeAsStringAsync(tempPath, csvContent, { encoding: 'utf8' });

    await Sharing.shareAsync(tempPath, {
      mimeType: 'text/csv',
      dialogTitle: 'Exportar Inventario GanPro',
      UTI: 'public.comma-separated-values-text'
    });
  }
}
