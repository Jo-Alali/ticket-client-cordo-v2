const fs = require('fs');
const path = require('path');

class BackupManager {
    constructor(dbPath) {
        this.dbPath = dbPath;
        this.backupDir = path.join(path.dirname(dbPath), 'backups');
        this.maxBackups = 30; // Garder 30 sauvegardes maximum
        this.autoBackupInterval = 24 * 60 * 60 * 1000; // 24 heures
        this.autoBackupTimer = null;
        
        this.initBackupDir();
    }

    // Initialiser le dossier de sauvegarde
    initBackupDir() {
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
            console.log('📁 Dossier de sauvegarde créé:', this.backupDir);
        }
    }

    // Créer une sauvegarde
    createBackup(description = '') {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupName = `tickets-backup-${timestamp}.db`;
            const backupPath = path.join(this.backupDir, backupName);
            
            // Copier le fichier de base de données
            fs.copyFileSync(this.dbPath, backupPath);
            
            // Créer un fichier de métadonnées
            const metadata = {
                timestamp: new Date().toISOString(),
                description: description,
                originalSize: fs.statSync(this.dbPath).size,
                backupSize: fs.statSync(backupPath).size
            };
            
            const metadataPath = backupPath.replace('.db', '.json');
            fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
            
            console.log(`✅ Sauvegarde créée: ${backupName}`);
            
            // Nettoyer les anciennes sauvegardes
            this.cleanupOldBackups();
            
            return {
                success: true,
                backupPath: backupPath,
                backupName: backupName,
                metadata: metadata
            };
        } catch (error) {
            console.error('❌ Erreur lors de la sauvegarde:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Nettoyer les anciennes sauvegardes
    cleanupOldBackups() {
        try {
            const files = fs.readdirSync(this.backupDir)
                .filter(file => file.endsWith('.db'))
                .map(file => ({
                    name: file,
                    path: path.join(this.backupDir, file),
                    stats: fs.statSync(path.join(this.backupDir, file))
                }))
                .sort((a, b) => b.stats.mtime - a.stats.mtime);

            // Supprimer les sauvegardes en excès
            if (files.length > this.maxBackups) {
                const toDelete = files.slice(this.maxBackups);
                toDelete.forEach(file => {
                    try {
                        fs.unlinkSync(file.path);
                        // Supprimer aussi le fichier de métadonnées
                        const metadataPath = file.path.replace('.db', '.json');
                        if (fs.existsSync(metadataPath)) {
                            fs.unlinkSync(metadataPath);
                        }
                        console.log(`🗑️ Sauvegarde supprimée: ${file.name}`);
                    } catch (error) {
                        console.error(`❌ Erreur suppression ${file.name}:`, error.message);
                    }
                });
            }
        } catch (error) {
            console.error('❌ Erreur nettoyage sauvegardes:', error.message);
        }
    }

    // Lister les sauvegardes disponibles
    listBackups() {
        try {
            const files = fs.readdirSync(this.backupDir)
                .filter(file => file.endsWith('.db'))
                .map(file => {
                    const filePath = path.join(this.backupDir, file);
                    const metadataPath = filePath.replace('.db', '.json');
                    const stats = fs.statSync(filePath);
                    
                    let metadata = {};
                    if (fs.existsSync(metadataPath)) {
                        try {
                            metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
                        } catch (error) {
                            console.error(`❌ Erreur lecture métadonnées ${file}:`, error.message);
                        }
                    }
                    
                    return {
                        name: file,
                        path: filePath,
                        size: stats.size,
                        created: stats.mtime,
                        metadata: metadata
                    };
                })
                .sort((a, b) => b.created - a.created);

            return files;
        } catch (error) {
            console.error('❌ Erreur liste sauvegardes:', error.message);
            return [];
        }
    }

    // Restaurer une sauvegarde
    restoreBackup(backupName) {
        try {
            const backupPath = path.join(this.backupDir, backupName);
            
            if (!fs.existsSync(backupPath)) {
                throw new Error(`Sauvegarde non trouvée: ${backupName}`);
            }
            
            // Créer une sauvegarde de la base actuelle avant restauration
            const currentBackup = this.createBackup('Sauvegarde avant restauration');
            
            // Remplacer la base de données actuelle
            fs.copyFileSync(backupPath, this.dbPath);
            
            console.log(`✅ Base de données restaurée depuis: ${backupName}`);
            
            return {
                success: true,
                restoredFrom: backupName,
                currentBackup: currentBackup.backupName
            };
        } catch (error) {
            console.error('❌ Erreur restauration:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Démarrer la sauvegarde automatique
    startAutoBackup() {
        if (this.autoBackupTimer) {
            clearInterval(this.autoBackupTimer);
        }
        
        this.autoBackupTimer = setInterval(() => {
            console.log('🔄 Sauvegarde automatique en cours...');
            const result = this.createBackup('Sauvegarde automatique');
            if (result.success) {
                console.log('✅ Sauvegarde automatique terminée');
            } else {
                console.error('❌ Échec sauvegarde automatique:', result.error);
            }
        }, this.autoBackupInterval);
        
        console.log('⏰ Sauvegarde automatique activée (toutes les 24h)');
    }

    // Arrêter la sauvegarde automatique
    stopAutoBackup() {
        if (this.autoBackupTimer) {
            clearInterval(this.autoBackupTimer);
            this.autoBackupTimer = null;
            console.log('⏹️ Sauvegarde automatique arrêtée');
        }
    }

    // Obtenir les statistiques des sauvegardes
    getBackupStats() {
        const backups = this.listBackups();
        const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);
        
        return {
            totalBackups: backups.length,
            totalSize: totalSize,
            totalSizeMB: Math.round(totalSize / 1024 / 1024 * 100) / 100,
            oldestBackup: backups.length > 0 ? backups[backups.length - 1].created : null,
            newestBackup: backups.length > 0 ? backups[0].created : null,
            autoBackupActive: this.autoBackupTimer !== null
        };
    }

    // Supprimer une sauvegarde spécifique
    deleteBackup(backupName) {
        try {
            const backupPath = path.join(this.backupDir, backupName);
            const metadataPath = backupPath.replace('.db', '.json');
            
            if (fs.existsSync(backupPath)) {
                fs.unlinkSync(backupPath);
            }
            
            if (fs.existsSync(metadataPath)) {
                fs.unlinkSync(metadataPath);
            }
            
            console.log(`🗑️ Sauvegarde supprimée: ${backupName}`);
            return { success: true };
        } catch (error) {
            console.error('❌ Erreur suppression sauvegarde:', error.message);
            return { success: false, error: error.message };
        }
    }
}

module.exports = BackupManager;
