import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
    { ignores: ["dist", "node_modules"] },
    {
        files: ["**/*.{ts,tsx}"],
        extends: [js.configs.recommended, ...tseslint.configs.recommended],
        plugins: {
            "react-hooks": reactHooks,
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],

            // Garde-fous de complexité, en avertissement seulement : ils ne
            // doivent pas faire échouer l'intégration continue. Les seuils sont
            // volontairement au-dessus de la moyenne du code existant — le but
            // est d'alerter sur une nouvelle fonction qui dérape, pas de
            // signaler la dette déjà présente.
            complexity: ["warn", 20],
            "max-lines-per-function": [
                "warn",
                { max: 200, skipBlankLines: true, skipComments: true },
            ],
        },
    },
);
