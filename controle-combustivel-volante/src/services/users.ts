import pb from '@/lib/pocketbase/client'

export type UserRecord = {
  id: string
  name: string
  email: string
  admin: boolean
  created: string
  updated: string
}

export const getUsers = () =>
  pb.collection('users').getFullList({ sort: '-created' }) as Promise<UserRecord[]>

export const updateUserAdmin = (id: string, admin: boolean) =>
  pb.collection('users').update(id, { admin })

export const updateUser = (id: string, data: { name?: string; email?: string; admin?: boolean }) =>
  pb.collection('users').update(id, data)

export const deleteUser = async (id: string): Promise<void> => {
  try {
    await pb.send(`/backend/v1/users/${id}`, {
      method: 'DELETE',
    })
  } catch (err: unknown) {
    // Se o endpoint customizado falhar por qualquer motivo não-404, fallback para API padrão
    const responseError = err as { status?: number }
    if (responseError?.status === 404) {
      await pb.collection('users').delete(id)
      return
    }
    throw err
  }
}

export const createUser = (data: {
  name: string
  email: string
  password: string
  passwordConfirm: string
  admin?: boolean
}) => pb.collection('users').create(data)

export const resetUserPassword = async (
  userId: string,
  payload: { password: string; passwordConfirm: string },
): Promise<{ success: boolean; message: string }> => {
  return pb.send<{ success: boolean; message: string }>(
    `/backend/v1/users/${userId}/reset-password`,
    {
      method: 'POST',
      body: payload,
    },
  )
}
