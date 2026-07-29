<script setup lang="ts">
import {
  EnvelopeIcon,
  FingerPrintIcon,
  IdentificationIcon,
  MapPinIcon,
  PhoneIcon,
  UserIcon,
} from '@heroicons/vue/24/outline'
import FormIconField from '@/components/FormIconField.vue'
import type { UserProfile } from '@/types/userProfile'

const model = defineModel<UserProfile>({ required: true })

const props = withDefaults(
  defineProps<{
    idPrefix?: string
    /** Formularios legacy (equipo directivo, estructura) exigen todos los campos. */
    requireAllProfileFields?: boolean
    /** Evita autocompletado del navegador (formularios de alta de terceros). */
    disableAutofill?: boolean
    /** Muestra etiquetas e iconos (modales RBAC). */
    variant?: 'default' | 'labeled'
  }>(),
  { requireAllProfileFields: false, disableAutofill: false, variant: 'default' },
)

const textAutocomplete = (disableAutofill: boolean) => (disableAutofill ? 'off' : undefined)
const usernameAutocomplete = (disableAutofill: boolean) => (disableAutofill ? 'off' : 'nickname')
const emailAutocomplete = (disableAutofill: boolean) => (disableAutofill ? 'off' : 'email')

const stackedInputClass =
  'w-full border-0 bg-transparent p-0 text-sm font-medium text-gray-900 outline-none placeholder:text-gray-400 focus:ring-0 dark:text-white dark:placeholder:text-gray-500'
</script>

<template>
  <div v-if="variant === 'labeled'" class="grid gap-4 sm:grid-cols-2">
    <FormIconField
      label="Usuario"
      label-position="inside"
      :icon="UserIcon"
      :html-for="`${idPrefix || 'user'}-username`"
    >
      <input
        :id="`${idPrefix || 'user'}-username`"
        v-model="model.username"
        required
        :autocomplete="usernameAutocomplete(props.disableAutofill)"
        placeholder="Nombre de usuario"
        :class="stackedInputClass"
      />
    </FormIconField>

    <FormIconField
      label="Nombre completo"
      label-position="inside"
      :icon="UserIcon"
      :html-for="`${idPrefix || 'user'}-fullName`"
    >
      <input
        :id="`${idPrefix || 'user'}-fullName`"
        v-model="model.fullName"
        required
        :autocomplete="textAutocomplete(props.disableAutofill)"
        placeholder="Nombre completo"
        :class="stackedInputClass"
      />
    </FormIconField>

    <FormIconField
      label="Email"
      label-position="inside"
      :icon="EnvelopeIcon"
      :html-for="`${idPrefix || 'user'}-personalEmail`"
    >
      <input
        :id="`${idPrefix || 'user'}-personalEmail`"
        v-model="model.personalEmail"
        required
        type="email"
        :autocomplete="emailAutocomplete(props.disableAutofill)"
        placeholder="Mail personal"
        :class="stackedInputClass"
      />
    </FormIconField>

    <FormIconField
      label="DNI"
      label-position="inside"
      :icon="IdentificationIcon"
      :html-for="`${idPrefix || 'user'}-dni`"
    >
      <input
        :id="`${idPrefix || 'user'}-dni`"
        v-model="model.dni"
        :required="requireAllProfileFields"
        :autocomplete="textAutocomplete(props.disableAutofill)"
        placeholder="DNI"
        :class="stackedInputClass"
      />
    </FormIconField>

    <FormIconField
      label="Teléfono"
      label-position="inside"
      :icon="PhoneIcon"
      :html-for="`${idPrefix || 'user'}-phone`"
    >
      <input
        :id="`${idPrefix || 'user'}-phone`"
        v-model="model.phone"
        :required="requireAllProfileFields"
        type="tel"
        :autocomplete="textAutocomplete(props.disableAutofill)"
        placeholder="Teléfono"
        :class="stackedInputClass"
      />
    </FormIconField>

    <FormIconField
      label="CUIL"
      label-position="inside"
      :icon="FingerPrintIcon"
      :html-for="`${idPrefix || 'user'}-cuil`"
    >
      <input
        :id="`${idPrefix || 'user'}-cuil`"
        v-model="model.cuil"
        :required="requireAllProfileFields"
        :autocomplete="textAutocomplete(props.disableAutofill)"
        placeholder="CUIL"
        :class="stackedInputClass"
      />
    </FormIconField>

    <FormIconField
      label="Dirección"
      label-position="inside"
      :icon="MapPinIcon"
      :html-for="`${idPrefix || 'user'}-address`"
      :col-span="2"
    >
      <input
        :id="`${idPrefix || 'user'}-address`"
        v-model="model.address"
        :required="requireAllProfileFields"
        :autocomplete="textAutocomplete(props.disableAutofill)"
        placeholder="Dirección"
        :class="stackedInputClass"
      />
    </FormIconField>
  </div>

  <div v-else class="grid gap-3 sm:grid-cols-2">
    <input
      :id="`${idPrefix || 'user'}-username`"
      v-model="model.username"
      required
      :autocomplete="usernameAutocomplete(props.disableAutofill)"
      placeholder="Nombre de usuario *"
      class="form-field"
    />
    <input
      :id="`${idPrefix || 'user'}-fullName`"
      v-model="model.fullName"
      required
      :autocomplete="textAutocomplete(props.disableAutofill)"
      placeholder="Nombre completo *"
      class="form-field"
    />
    <input
      :id="`${idPrefix || 'user'}-personalEmail`"
      v-model="model.personalEmail"
      required
      type="email"
      :autocomplete="emailAutocomplete(props.disableAutofill)"
      placeholder="Mail personal *"
      class="form-field"
    />
    <input
      :id="`${idPrefix || 'user'}-phone`"
      v-model="model.phone"
      :required="requireAllProfileFields"
      type="tel"
      :autocomplete="textAutocomplete(props.disableAutofill)"
      placeholder="Teléfono"
      class="form-field"
    />
    <input
      :id="`${idPrefix || 'user'}-dni`"
      v-model="model.dni"
      :required="requireAllProfileFields"
      :autocomplete="textAutocomplete(props.disableAutofill)"
      placeholder="DNI"
      class="form-field"
    />
    <input
      :id="`${idPrefix || 'user'}-cuil`"
      v-model="model.cuil"
      :required="requireAllProfileFields"
      :autocomplete="textAutocomplete(props.disableAutofill)"
      placeholder="CUIL"
      class="form-field"
    />
    <input
      :id="`${idPrefix || 'user'}-address`"
      v-model="model.address"
      :required="requireAllProfileFields"
      :autocomplete="textAutocomplete(props.disableAutofill)"
      placeholder="Dirección"
      class="form-field sm:col-span-2"
    />
  </div>
</template>
