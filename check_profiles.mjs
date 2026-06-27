import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://muhxylbcgvwxjzrbkgdc.supabase.co",
  "sb_publishable_fHXuJnxS_EF5b6IzLf9FHg_Yaui0SmI"
);

const { data, error } = await supabase.from("profiles").select("id, full_name, username, role, email");

if (error) {
  console.error("Error:", error);
} else {
  console.log("Profiles:");
  data.forEach(p => console.log(`  ${p.full_name} | ${p.username} | ${p.email} | ${p.role}`));
}
