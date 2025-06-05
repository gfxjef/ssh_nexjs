// Script para probar permisos de catálogos
// Ejecutar en la consola del navegador para verificar permisos

console.log('🔧 Testing catalogos permissions...');

// Simular diferentes roles
const testRoles = ['admin', 'gerente', 'marketing', 'vendedor'];

// Importar el manager de permisos
import { menuAccessManager } from './lib/permissions/MenuAccessManager.js';

testRoles.forEach(role => {
  console.log(`\n👤 Testing role: ${role}`);
  menuAccessManager.setUserRole(role);
  
  console.log(`  ✅ Can view catalogos: ${menuAccessManager.hasButtonAccess('catalogos.view')}`);
  console.log(`  ➕ Can add catalogos: ${menuAccessManager.hasButtonAccess('catalogos.add')}`);
  console.log(`  ✏️ Can update catalogos: ${menuAccessManager.hasButtonAccess('catalogos.update')}`);
  console.log(`  🗑️ Can delete catalogos: ${menuAccessManager.hasButtonAccess('catalogos.delete')}`);
  console.log(`  📥 Can download catalogos: ${menuAccessManager.hasButtonAccess('catalogos.download')}`);
  console.log(`  📤 Can share catalogos: ${menuAccessManager.hasButtonAccess('catalogos.share')}`);
  console.log(`  ⚠️ Can report catalogos: ${menuAccessManager.hasButtonAccess('catalogos.report')}`);
});

console.log('\n🏁 Permission testing complete!'); 