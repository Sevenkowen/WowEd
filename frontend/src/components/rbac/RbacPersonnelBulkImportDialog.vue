<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  CheckIcon,
  DocumentArrowUpIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'
import type { BulkPersonnelImportResult } from '@/api/superadminApi'
import { gcalPrimaryBtn } from '@/utils/calendarioGoogleTheme'
import {
  downloadPersonnelBulkTemplate,
  parsePersonnelBulkCsv,
  validPersonnelBulkRows,
  type PersonnelBulkParsedRow,
  type PersonnelBulkRoleOption,
} from '@/utils/personnelBulkImport'

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  institutionId?: string
  requireInstitution?: boolean
  roleOptions: PersonnelBulkRoleOption[]
  importRows: (rows: PersonnelBulkParsedRow['payload'][]) => Promise<BulkPersonnelImportResult>
}>()

const emit = defineEmits<{
  completed: []
}>()

const fileInputRef = ref<HTMLInputElement | null>(null)
const parseError = ref<string | null>(null)
const parsedRows = ref<PersonnelBulkParsedRow[]>([])
const importResult = ref<BulkPersonnelImportResult | null>(null)
const importing = ref(false)
const importError = ref<string | null>(null)

const validRows = computed(() => validPersonnelBulkRows(parsedRows.value))
const invalidRows = computed(() => parsedRows.value.filter((row) => row.errors.length > 0))
const canImport = computed(
  () => validRows.value.length > 0 && !importing.value && !importResult.value,
)

function resetState() {
  parseError.value = null
  parsedRows.value = []
  importResult.value = null
  importing.value = false
  importError.value = null
  if (fileInputRef.value) fileInputRef.value.value = ''
}

watch(open, (isOpen) => {
  if (!isOpen) resetState()
})

function onPickFile() {
  fileInputRef.value?.click()
}

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  parseError.value = null
  importResult.value = null
  importError.value = null

  try {
    const text = await file.text()
    const parsed = parsePersonnelBulkCsv(text, props.roleOptions)
    if (parsed.fatalError) {
      parseError.value = parsed.fatalError
      parsedRows.value = []
      return
    }
    parsedRows.value = parsed.rows
  } catch {
    parseError.value = 'No se pudo leer el archivo.'
    parsedRows.value = []
  }
}

async function submitImport() {
  if (!validRows.value.length) return
  importing.value = true
  importError.value = null
  try {
    importResult.value = await props.importRows(validRows.value.map((row) => row.payload))
    emit('completed')
  } catch (error) {
    importError.value = error instanceof Error ? error.message : 'No se pudo importar el archivo'
  } finally {
    importing.value = false
  }
}

function closeDialog() {
  open.value = false
}
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    @click.self="closeDialog"
  >
    <div
      class="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-white/10 dark:bg-gray-900"
      role="dialog"
      aria-labelledby="bulk-import-title"
    >
      <header class="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
        <div class="min-w-0">
          <h3 id="bulk-import-title" class="text-lg font-semibold text-gray-900 dark:text-white">
            Carga masiva de usuarios
          </h3>
          <p class="mt-1 text-sm text-muted">
            Descargá la plantilla, completala y subila para crear varios usuarios a la vez.
          </p>
        </div>
        <button
          type="button"
          class="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/10 dark:hover:text-gray-200"
          aria-label="Cerrar"
          @click="closeDialog"
        >
          <XMarkIcon class="size-5" />
        </button>
      </header>

      <div class="border-b border-gray-200 dark:border-white/10" />

      <div class="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
        <div class="flex flex-wrap gap-3">
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-lg border border-indigo-200 px-4 py-2.5 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-50 dark:border-indigo-500/30 dark:text-indigo-300 dark:hover:bg-indigo-950/30"
            @click="downloadPersonnelBulkTemplate()"
          >
            <ArrowDownTrayIcon class="size-4" />
            Descargar plantilla
          </button>

          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/5"
            @click="onPickFile"
          >
            <ArrowUpTrayIcon class="size-4" />
            Subir archivo completado
          </button>
          <input
            ref="fileInputRef"
            type="file"
            accept=".csv,text/csv"
            class="hidden"
            @change="onFileChange"
          />
        </div>

        <div class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-muted dark:border-white/10 dark:bg-gray-950/40">
          <p class="font-medium text-gray-900 dark:text-white">Columnas de la plantilla</p>
          <p class="mt-1">
            Obligatorias: usuario, email, nombre_completo, contraseña, rol.
            Opcionales: colegio, dni, cuil, telefono, direccion.
          </p>
          <p class="mt-2">
            En <span class="font-medium text-gray-800 dark:text-gray-200">rol</span> usá el código
            (<code class="text-xs">director</code>, <code class="text-xs">administrador</code>) o el
            nombre del rol personalizado.
          </p>
        </div>

        <p
          v-if="requireInstitution && !institutionId"
          class="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
        >
          Seleccioná una institución antes de importar usuarios.
        </p>

        <p
          v-if="parseError"
          class="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
          role="alert"
        >
          {{ parseError }}
        </p>

        <p
          v-if="importError"
          class="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
          role="alert"
        >
          {{ importError }}
        </p>

        <div
          v-if="parsedRows.length"
          class="overflow-hidden rounded-xl border border-gray-200 dark:border-white/10"
        >
          <div class="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-gray-950/40">
            <p class="text-sm font-medium text-gray-900 dark:text-white">
              Vista previa: {{ validRows.length }} fila(s) válida(s)
              <span v-if="invalidRows.length"> · {{ invalidRows.length }} con errores</span>
            </p>
          </div>
          <div class="max-h-64 overflow-auto">
            <table class="min-w-full divide-y divide-gray-200 text-sm dark:divide-white/10">
              <thead class="bg-gray-50 dark:bg-gray-950/40">
                <tr>
                  <th class="px-3 py-2 text-left font-medium text-muted">Fila</th>
                  <th class="px-3 py-2 text-left font-medium text-muted">Usuario</th>
                  <th class="px-3 py-2 text-left font-medium text-muted">Nombre</th>
                  <th class="px-3 py-2 text-left font-medium text-muted">Rol</th>
                  <th class="px-3 py-2 text-left font-medium text-muted">Estado</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-white/10">
                <tr v-for="row in parsedRows" :key="row.rowNumber">
                  <td class="px-3 py-2 text-muted">{{ row.rowNumber }}</td>
                  <td class="px-3 py-2">{{ row.payload.username || '—' }}</td>
                  <td class="px-3 py-2">{{ row.payload.fullName || '—' }}</td>
                  <td class="px-3 py-2">{{ row.payload.positionKey || '—' }}</td>
                  <td class="px-3 py-2">
                    <span
                      v-if="row.errors.length"
                      class="text-red-600 dark:text-red-400"
                      :title="row.errors.join('; ')"
                    >
                      {{ row.errors[0] }}
                    </span>
                    <span v-else class="text-emerald-600 dark:text-emerald-400">Lista</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div
          v-if="importResult"
          class="rounded-lg border border-emerald-200 bg-emerald-50/70 px-4 py-3 dark:border-emerald-500/30 dark:bg-emerald-950/30"
        >
          <p class="text-sm font-medium text-gray-900 dark:text-white">
            Importación finalizada: {{ importResult.created }} creado(s),
            {{ importResult.linked }} vinculado(s), {{ importResult.failed }} error(es).
          </p>
          <ul
            v-if="importResult.results.some((item) => item.status === 'failed')"
            class="mt-2 max-h-32 space-y-1 overflow-auto text-sm text-red-700 dark:text-red-300"
          >
            <li
              v-for="item in importResult.results.filter((entry) => entry.status === 'failed')"
              :key="`failed-${item.row}`"
            >
              Fila {{ item.row }}<span v-if="item.username"> ({{ item.username }})</span>:
              {{ item.error }}
            </li>
          </ul>
        </div>
      </div>

      <div class="flex shrink-0 flex-wrap justify-end gap-2 border-t border-gray-200 px-6 py-4 dark:border-white/10">
        <button
          type="button"
          class="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/5"
          @click="closeDialog"
        >
          {{ importResult ? 'Cerrar' : 'Cancelar' }}
        </button>
        <button
          v-if="!importResult"
          type="button"
          class="inline-flex items-center gap-2 disabled:opacity-60"
          :class="gcalPrimaryBtn"
          :disabled="!canImport || (requireInstitution && !institutionId)"
          @click="submitImport"
        >
          <DocumentArrowUpIcon v-if="!importing" class="size-4" />
          <CheckIcon v-else class="size-4" />
          {{ importing ? 'Importando…' : `Importar ${validRows.length} usuario(s)` }}
        </button>
      </div>
    </div>
  </div>
</template>
