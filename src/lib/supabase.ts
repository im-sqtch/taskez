import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Os query builders do supabase-js são "thenables" preguiçosos: a requisição só é
// disparada quando algo chama `.then()`/await neles. Um `void builder` sozinho
// nunca executa a chamada. Use isto para escritas "fire-and-forget" (otimistas,
// já refletidas no estado local) sem precisar tornar a action async.
export function fireAndForget(query: PromiseLike<unknown>) {
  Promise.resolve(query).catch(() => {})
}
