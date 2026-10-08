import { Monitor, Moon, Sun } from "lucide-react";
import { Segmented } from "~/components/ui/Segmented";
import { setThemePref, useThemePref, type ThemePref } from "~/lib/theme";

export function ThemeToggle() {
  const pref = useThemePref();

  return (
    <Segmented<ThemePref>
      label="Colour theme"
      hideLabel
      size="sm"
      value={pref}
      onChange={setThemePref}
      options={[
        { value: "light", label: <Sun size={16} aria-hidden />, ariaLabel: "Light theme" },
        { value: "dark", label: <Moon size={16} aria-hidden />, ariaLabel: "Dark theme" },
        {
          value: "system",
          label: <Monitor size={16} aria-hidden />,
          ariaLabel: "Match device theme",
        },
      ]}
    />
  );
}
