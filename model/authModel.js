const SUPABASE_URL = "https://qolnrroxnaowquhuzleq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_N4GU5yoBiGBIi9VJBkuTJA_Ui_B3-Ov";

// Exponer supabase globalmente
window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

window.AuthModel = {
  async verificarUsuario(usuario, password) {
    const { data, error } = await window.supabaseClient
      .from("usuarios")
      .select("*")
      .eq("usuario", usuario)
      .eq("password", password)
      .single();

    if (error) return null;
    return data;
  },
};