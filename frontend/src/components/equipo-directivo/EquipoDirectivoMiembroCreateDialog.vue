<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionChild,
  TransitionRoot,
} from '@headlessui/vue'
import { XMarkIcon } from '@heroicons/vue/20/solid'
import {
  createLeadershipMember,
  fetchInstitutionSchools,
  fetchLeadershipPositions,
  type LeadershipMember,
  type LeadershipPosition,
  type InstitutionSchool,
} from '@/api/institutionApi'
import { useAuth } from '@/composables/useAuth'
import UserProfileFormFields from '@/components/UserProfileFormFields.vue'
import { emptyUserProfile } from '@/types/userProfile'

defineOptions({ name: 'EquipoDirectivoMiembroCreateDialog' })

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  created: [member: LeadershipMember]
}>()

const { user } = useAuth()

const positions = ref<LeadershipPosition[]>([])
const schools = ref<InstitutionSchool[]>([])
const profile = ref(emptyUserProfile())
const password = ref('')
const positionKey = ref('')
const schoolId = ref('')
const formError = ref('')
const saving = ref(false)

const inputClass =
  'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 dark:border-white/10 dark:bg-gray-900 dark:text-white dark:focus:border-purple-500 dark:focus:ring-purple-500/20'
const labelClass = 'mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300'

async function loadOptions() {
  const [pos, sch] = await Promise.all([
    positions.value.length ? Promise.resolve(positions.value) : fetchLeadershipPositions(),
    schools.value.length ? Promise.resolve(schools.value) : fetchInstitutionSchools(),
  ])
  positions.value = pos
  schools.value = sch
  if (!positionKey.value && pos.length) positionKey.value = pos[0]!.key
  if (!schoolId.value) {
    const preferred = user.value?.school_id
    schoolId.value =
      (preferred && sch.some((s) => s.id === preferred) ? preferred : sch[0]?.id) ?? ''
  }
}

function resetForm() {
  profile.value = emptyUserProfile()
  password.value = ''
  positionKey.value = positions.value[0]?.key ?? ''
  schoolId.value =
    (user.value?.school_id && schools.value.some((s) => s.id === user.value?.school_id)
      ? user.value.school_id
      : schools.value[0]?.id) ?? ''
  formError.value = ''
}

watch(open, (isOpen) => {
  if (isOpen) {
    void loadOptions().then(() => resetForm())
  }
})

function close() {
  open.value = false
  formError.value = ''
}

async function onSubmit() {
  formError.value = ''
  if (!password.value || password.value.length < 8) {
    formError.value = 'La contraseña debe tener al menos 8 caracteres'
    return
  }
  if (!positionKey.value) {
    formError.value = 'Seleccioná un cargo'
    return
  }
  if (!schoolId.value) {
    formError.value = 'Seleccioná una escuela'
    return
  }
  saving.value = true
  try {
    const created = await createLeadershipMember({
      ...profile.value,
      positionKey: positionKey.value,
      password: password.value,
      schoolId: schoolId.value,
    })
    emit('created', created)
    close()
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'No se pudo crear el miembro'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <TransitionRoot as="template" :show="open">
    <Dialog class="relative z-50" @close="close">
      <TransitionChild
        as="template"
        enter="ease-out duration-200"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="ease-in duration-150"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-gray-900/50 dark:bg-black/60" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto p-4 sm:p-6">
        <div class="flex min-h-full items-center justify-center">
          <TransitionChild
            as="template"
            enter="ease-out duration-200"
            enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enter-to="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-150"
            leave-from="opacity-100 translate-y-0 sm:scale-100"
            leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <DialogPanel
              class="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-gray-800"
            >
              <div class="flex items-start justify-between gap-3">
                <DialogTitle class="text-lg font-semibold text-gray-900 dark:text-white">
                  Añadir miembro
                </DialogTitle>
                <button
                  type="button"
                  class="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/10 dark:hover:text-gray-200"
                  @click="close"
                >
                  <XMarkIcon class="size-5" />
                </button>
              </div>

              <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Se creará un usuario con acceso a WowEd. Compartí la contraseña con la persona.
              </p>

              <form class="mt-5 space-y-4" @submit.prevent="onSubmit">
                <div class="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label for="new-member-school" :class="labelClass">Escuela</label>
                    <select id="new-member-school" v-model="schoolId" required :class="inputClass">
                      <option v-for="s in schools" :key="s.id" :value="s.id">{{ s.name }}</option>
                    </select>
                  </div>
                  <div>
                    <label for="new-member-position" :class="labelClass">Cargo</label>
                    <select id="new-member-position" v-model="positionKey" required :class="inputClass">
                      <option v-for="p in positions" :key="p.key" :value="p.key">{{ p.label }}</option>
                    </select>
                  </div>
                </div>
                <UserProfileFormFields v-model="profile" id-prefix="new-member" require-all-profile-fields />
                <div>
                  <label for="new-member-password" :class="labelClass">Contraseña inicial</label>
                  <input
                    id="new-member-password"
                    v-model="password"
                    type="password"
                    required
                    minlength="8"
                    autocomplete="new-password"
                    :class="inputClass"
                  />
                </div>

                <p v-if="formError" class="text-sm text-red-600 dark:text-red-400">{{ formError }}</p>

                <div class="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    class="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/5"
                    @click="close"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    :disabled="saving"
                    class="rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-purple-500 disabled:opacity-60"
                  >
                    {{ saving ? 'Creando…' : 'Crear miembro' }}
                  </button>
                </div>
              </form>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
