'use client';

import React, { useState } from 'react';
import GroupSelector from './GroupSelector';

/**
 * Componente de demostración para probar el GroupSelector
 * Este archivo se puede eliminar una vez verificado el funcionamiento
 */
export default function GroupSelectorDemo() {
  const [selectedGroup1, setSelectedGroup1] = useState<'kossodo' | 'kossomet' | 'grupo_kossodo' | undefined>(undefined);
  const [selectedGroup2, setSelectedGroup2] = useState<'kossodo' | 'kossomet' | 'grupo_kossodo' | undefined>('kossodo');
  const [selectedGroup3, setSelectedGroup3] = useState<'kossodo' | 'kossomet' | 'grupo_kossodo' | undefined>('kossomet');

  // Datos de ejemplo para contadores
  const mockGroupCounts = {
    'kossodo': 45,
    'kossomet': 32,
    'grupo_kossodo': 78
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          🧪 Demo: GroupSelector Component
        </h1>
        <p className="text-gray-600 mb-6">
          Prueba interactiva del componente de selección de grupos empresariales
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Ejemplo 1: Selector básico requerido */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-800">
              1. Selector Básico (Requerido)
            </h3>
            <GroupSelector
              selectedGroup={selectedGroup1}
              onGroupChange={setSelectedGroup1}
              required={true}
              placeholder="Selecciona tu grupo empresarial"
            />
            <p className="text-sm text-gray-600">
              Grupo seleccionado: <code className="bg-gray-100 px-2 py-1 rounded">{selectedGroup1 || 'ninguno'}</code>
            </p>
          </div>

          {/* Ejemplo 2: Selector con contadores */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-800">
              2. Con Contadores de Documentos
            </h3>
            <GroupSelector
              selectedGroup={selectedGroup2}
              onGroupChange={setSelectedGroup2}
              showCounts={true}
              groupCounts={mockGroupCounts}
            />
            <p className="text-sm text-gray-600">
              Grupo seleccionado: <code className="bg-gray-100 px-2 py-1 rounded">{selectedGroup2}</code>
            </p>
          </div>

          {/* Ejemplo 3: Selector tamaño pequeño */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-800">
              3. Tamaño Pequeño
            </h3>
            <GroupSelector
              selectedGroup={selectedGroup3}
              onGroupChange={setSelectedGroup3}
              size="sm"
              showCounts={true}
              groupCounts={mockGroupCounts}
            />
            <p className="text-sm text-gray-600">
              Grupo seleccionado: <code className="bg-gray-100 px-2 py-1 rounded">{selectedGroup3}</code>
            </p>
          </div>

          {/* Ejemplo 4: Selector deshabilitado */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-800">
              4. Deshabilitado
            </h3>
            <GroupSelector
              selectedGroup="grupo_kossodo"
              onGroupChange={() => {}}
              disabled={true}
              size="md"
            />
            <p className="text-sm text-gray-600">
              Estado: <span className="text-gray-500">Deshabilitado</span>
            </p>
          </div>
        </div>

        {/* Ejemplo de uso del código */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            📋 Ejemplo de Uso
          </h3>
          <pre className="text-sm text-gray-700 overflow-x-auto">
{`import { GroupSelector } from './components';

function MyComponent() {
  const [selectedGroup, setSelectedGroup] = useState();
  
  return (
    <GroupSelector
      selectedGroup={selectedGroup}
      onGroupChange={setSelectedGroup}
      required={true}
      showCounts={true}
      groupCounts={{
        'kossodo': 45,
        'kossomet': 32,
        'grupo_kossodo': 78
      }}
    />
  );
}`}
          </pre>
        </div>

        {/* Colores corporativos */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            🎨 Colores Corporativos
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
              <div className="w-8 h-8 bg-[#2563EB] rounded flex items-center justify-center text-white">
                🏢
              </div>
              <div>
                <div className="font-medium">Kossodo</div>
                <div className="text-sm text-gray-600">#2563EB</div>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
              <div className="w-8 h-8 bg-[#059669] rounded flex items-center justify-center text-white">
                🏭
              </div>
              <div>
                <div className="font-medium">Kossomet</div>
                <div className="text-sm text-gray-600">#059669</div>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-[#6B7280] rounded flex items-center justify-center text-white">
                🏛️
              </div>
              <div>
                <div className="font-medium">Grupo Kossodo</div>
                <div className="text-sm text-gray-600">#6B7280</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 