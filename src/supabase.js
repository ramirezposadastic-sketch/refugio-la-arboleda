import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  "https://asbrqmsecvuptztfnruc.supabase.co";

const supabaseKey =
  "sb_publishable_2vzaCzDvM-peAW4t-_nTew_8A4UPOpA";

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);