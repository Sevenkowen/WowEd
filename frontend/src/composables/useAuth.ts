import { computed, ref } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { changePasswordApi, loginApi, meApi, type AuthUser, type DirectorContext } from '@/api/authApi'
import { useApi } from '@/api/http'

const TOKEN_KEY = 'wowed-auth-token'
const USER_KEY = 'wowed-auth-user'

const token = ref<string | null>(readToken())
const user = ref<AuthUser | null>(readUser())
const contexts = ref<DirectorContext[]>([])
const bootstrapped = ref(false)

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function readUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

function persistSession(accessToken: string, authUser: AuthUser, directorContexts: DirectorContext[]) {
  token.value = accessToken
  user.value = authUser
  contexts.value = directorContexts
  localStorage.setItem(TOKEN_KEY, accessToken)
  localStorage.setItem(USER_KEY, JSON.stringify(authUser))
}

function clearSession() {
  token.value = null
  user.value = null
  contexts.value = []
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function getAuthToken(): string | null {
  return token.value
}

export function getAuthInstitutionId(): string | undefined {
  return user.value?.institution_id ?? undefined
}

export function homeRouteForUser(authUser: AuthUser): RouteLocationRaw {
  if (authUser.must_change_password) {
    return { name: 'change-password' }
  }
  if (
    authUser.role === 'superadmin' ||
    authUser.role === 'owner' ||
    authUser.is_superadmin ||
    authUser.is_owner
  ) {
    return { name: 'superadmin-dashboard' }
  }
  if (authUser.role === 'administrador') {
    return { name: 'admin-dashboard' }
  }
  return '/planificador-anual'
}

export function useAuth() {
  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const isDirector = computed(() => user.value?.role === 'director')
  const isAdministrador = computed(() => user.value?.role === 'administrador')
  const isSuperadmin = computed(
    () =>
      user.value?.role === 'superadmin' ||
      user.value?.role === 'owner' ||
      user.value?.is_superadmin === true ||
      user.value?.is_owner === true,
  )
  const isOwner = isSuperadmin
  const displayName = computed(() => user.value?.display_name ?? 'Usuario')
  const mustChangePassword = computed(() => user.value?.must_change_password === true)

  async function login(loginName: string, password: string): Promise<AuthUser> {
    const res = await loginApi(loginName, password)
    persistSession(res.access_token, res.user, res.contexts)
    bootstrapped.value = true
    return res.user
  }

  function logout(): void {
    clearSession()
    bootstrapped.value = false
  }

  async function restoreSession(): Promise<boolean> {
    if (!useApi() || !token.value) {
      bootstrapped.value = true
      return false
    }
    try {
      const res = await meApi()
      user.value = res.user
      contexts.value = res.contexts
      localStorage.setItem(USER_KEY, JSON.stringify(res.user))
      bootstrapped.value = true
      return true
    } catch {
      clearSession()
      bootstrapped.value = true
      return false
    }
  }

  async function refreshSession(): Promise<void> {
    if (!useApi() || !token.value) return
    const res = await meApi()
    user.value = res.user
    contexts.value = res.contexts
    localStorage.setItem(USER_KEY, JSON.stringify(res.user))
  }

  async function changePassword(currentPassword: string, newPassword: string): Promise<AuthUser> {
    const res = await changePasswordApi(currentPassword, newPassword)
    user.value = res.user
    localStorage.setItem(USER_KEY, JSON.stringify(res.user))
    return res.user
  }

  function syncProfileFromLeadershipMember(member: {
    id: string
    firstName: string | null
    lastName: string | null
    email: string
    displayName: string
  }): void {
    if (!user.value || user.value.id !== member.id) return
    user.value = {
      ...user.value,
      first_name: member.firstName,
      last_name: member.lastName,
      email: member.email,
      display_name: member.displayName,
    }
    localStorage.setItem(USER_KEY, JSON.stringify(user.value))
  }

  return {
    token,
    user,
    contexts,
    bootstrapped,
    isAuthenticated,
    isDirector,
    isAdministrador,
    isSuperadmin,
    isOwner,
    displayName,
    mustChangePassword,
    login,
    logout,
    restoreSession,
    refreshSession,
    changePassword,
    homeRouteForUser,
    syncProfileFromLeadershipMember,
  }
}
