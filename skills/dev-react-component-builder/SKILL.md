---
name: dev-react-component-builder
description: Crée des composants React/Vue/Angular/Svelte optimisés et réutilisables. Se déclenche avec "composant React", "component", "Vue component", "Angular component", "Svelte", "hooks", "state management", "créer un composant".
---

# React Component Builder

## Workflow

### 1. Cadrage rapide

Avant de coder, confirmer :
- **Framework** : React 18+, Vue 3, Angular 17+, Svelte 5 ?
- **TypeScript** : oui (défaut) / non ?
- **Props attendues** : quelles données en entrée, quels callbacks en sortie ?
- **Réutilisabilité** : composant générique (design system) ou spécifique page ?
- **Contexte de style** : Tailwind, CSS Modules, CSS-in-JS, scoped ?

### 2. Design de l'API publique

Définir l'interface TypeScript avant toute implémentation.

```tsx
// React — props typées avec valeurs par défaut
interface ButtonProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
}

const Button = ({
  label,
  variant = 'primary',
  disabled = false,
  loading = false,
  onClick,
  className,
}: ButtonProps) => { /* ... */ };
```

**Critères de décision — quoi exposer :**
- Props minimales : n'exposer que ce que l'appelant doit contrôler.
- Éviter les props booléennes multiples exclusives → préférer un `variant` enum.
- Utiliser `children` plutôt qu'une prop `content` dès qu'il y a du JSX à injecter.
- Exposer `className` / `style` pour permettre l'extension sans override.

### 3. Choix du pattern d'architecture

| Cas d'usage | Pattern recommandé |
|---|---|
| Composant simple, état local | Composant fonctionnel + hooks |
| Composant avec sous-parties couplées | Compound components (`<Select><Option>`) |
| Logique réutilisable cross-composants | Custom hook |
| Inversion de contrôle sur le rendu | Render props / slot |
| Composant wrapper transparent | `forwardRef` + `useImperativeHandle` |

```tsx
// Compound components — exemple Select
const Select = ({ children, onChange }: SelectProps) => {
  const [value, setValue] = useState('');
  return (
    <SelectContext.Provider value={{ value, onChange: setValue }}>
      <div role="listbox">{children}</div>
    </SelectContext.Provider>
  );
};
Select.Option = SelectOption; // sous-composant attaché
```

### 4. State management — où vivre l'état

```
État local uniquement → useState / useReducer
Partage parent→enfants proches → props drilling (acceptable jusqu'à 2 niveaux)
Partage dans un sous-arbre → Context API + useContext
État global UI (modales, thème) → Zustand (React) / Pinia (Vue) / NgRx (Angular)
État serveur → React Query / SWR / Apollo (jamais dans un store global)
```

```tsx
// Zustand — slice minimal
import { create } from 'zustand';

interface ModalStore {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export const useModalStore = create<ModalStore>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
```

### 5. Styling — choix adapté au projet

```tsx
// CSS Modules (isolation, zéro runtime)
import styles from './Button.module.css';
<button className={`${styles.btn} ${styles[variant]}`}>{label}</button>

// Tailwind (utilitaire, tree-shaking natif)
const variantClass = { primary: 'bg-blue-600', secondary: 'bg-gray-200' }[variant];
<button className={`px-4 py-2 rounded ${variantClass} ${className ?? ''}`}>{label}</button>

// clsx pour conditions complexes (toujours préférer à template literals)
import clsx from 'clsx';
<button className={clsx('px-4 py-2', { 'opacity-50 cursor-not-allowed': disabled }, variantClass)}>
```

### 6. Accessibilité — non négociable

Checklist systématique :
- `role` ARIA correct (`button`, `dialog`, `listbox`, `alert`…).
- Navigation clavier : `tabIndex`, `onKeyDown` (Enter/Space pour les éléments cliquables).
- Labels : `aria-label` ou `aria-labelledby` sur tout élément interactif sans texte visible.
- Focus management : piéger le focus dans les modales (`focus-trap`), restaurer après fermeture.
- Contrastes : minimum 4.5:1 (texte normal), 3:1 (grand texte / UI).

```tsx
// Dialogue accessible
const Dialog = ({ title, onClose, children }: DialogProps) => {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { closeRef.current?.focus(); }, []);

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="dialog-title">
      <h2 id="dialog-title">{title}</h2>
      {children}
      <button ref={closeRef} onClick={onClose} aria-label="Fermer">✕</button>
    </div>
  );
};
```

### 7. Tests avec React Testing Library

```tsx
// Tester le comportement, pas l'implémentation
import { render, screen, userEvent } from '@testing-library/react';

test('appelle onClick avec le bon argument', async () => {
  const handleClick = vi.fn();
  render(<Button label="Valider" onClick={handleClick} />);
  await userEvent.click(screen.getByRole('button', { name: 'Valider' }));
  expect(handleClick).toHaveBeenCalledTimes(1);
});

test('bouton disabled ne déclenche pas onClick', async () => {
  const handleClick = vi.fn();
  render(<Button label="Valider" disabled onClick={handleClick} />);
  await userEvent.click(screen.getByRole('button'));
  expect(handleClick).not.toHaveBeenCalled();
});
```

Sélecteurs par priorité (RTL) : `getByRole` > `getByLabelText` > `getByText` > `getByTestId` (dernier recours).

### 8. Story Storybook

```tsx
// Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  component: Button,
  args: { label: 'Cliquer', variant: 'primary' },
};
export default meta;

export const Primary: StoryObj<typeof Button> = {};
export const Loading: StoryObj<typeof Button> = { args: { loading: true } };
export const Disabled: StoryObj<typeof Button> = { args: { disabled: true } };
```

## Anti-patterns / Pièges

- **Props drilling > 2 niveaux** → passer au Context ou store, pas ajouter une prop de plus.
- **useEffect pour dériver l'état** → utiliser `useMemo` ou calculer directement dans le render.
- **Index comme key dans les listes** → utiliser un identifiant stable ; l'index cause des bugs de réconciliation.
- **Mutation directe du state** → toujours retourner un nouvel objet/tableau en React.
- **Composant > 300 lignes** → signe de violation du SRP, extraire en sous-composants ou hooks.
- **Typage `any` ou `object`** → typer précisément ; utiliser `unknown` + assertion si nécessaire.
- **Logique métier dans le composant** → extraire dans un custom hook ou un service pur.
- **forwardRef oublié** → tout composant wrappé par une librairie UI doit exposer `forwardRef`.

## Bonnes pratiques 2026

- **React Compiler** (React 19+) : ne plus écrire `useMemo`/`useCallback` manuellement sur les composants compilés — laisser le compiler optimiser.
- **Server Components** (Next.js App Router) : composants sans état ni événements → `async` Server Component par défaut, Client Component (`'use client'`) uniquement si nécessaire.
- **Signals** (Angular 17+) : préférer `signal()` + `computed()` à `BehaviorSubject` pour l'état local.
- **Runes** (Svelte 5) : remplacent les stores réactifs legacy — utiliser `$state`, `$derived`, `$effect`.
- **Co-location** : placer test + story + styles + composant dans le même dossier `Button/`.


## Communication Rules — MANDATORY

- Ultra-concise. No filler, no preamble, no pleasantries.
- Never say "happy to help", "sure!", "great question", "let me", or similar.
- Tool first, talk second. Act before explaining.
- Result first. Lead with outcome, not process.
- Stop when done. No summary, no recap, no trailing commentary.
- No politeness wrappers. Direct and blunt.
- Minimum words. If one word works, do not use ten.
- No unsolicited explanations.
- No emoji unless asked.
