import { Modal } from '@mantine/core';
import type React from 'react';

import classes from '@/shared/patterns/colophon.module.css';
import { Rule } from '@/shared/ui/rule';

export interface ColophonProps {
  opened: boolean;
  onClose: () => void;
}

const FACES = [
  {
    name: 'Bricolage Grotesque',
    role: 'Display and interface. The scale leans on its width axis, which is why nothing else can stand in for it.',
  },
  {
    name: 'Newsreader',
    role: 'Prose only. Never in interface chrome, never on a button, never in metadata.',
  },
  {
    name: 'IBM Plex Mono',
    role: 'Every piece of metadata and every figure, with tabular figures wherever digits stack.',
  },
];

/*
 * `token` names a --site-* custom property. The swatches read the live token
 * rather than restating a hex, so this page cannot drift away from the
 * palette it describes.
 */
const DYES = [
  {
    token: 'mark',
    dye: 'Shōen-boku',
    note: 'Pine-soot sumi. Larger, softer particles than oil soot, so it reads matte and faintly blue-black rather than glossy brown-black. It shifts further toward blue as it ages.',
  },
  {
    token: 'ground',
    dye: 'Kinari',
    note: 'Undyed, unbleached hemp. Greyer and greener than ramie or flax, which is why it is a greige and not a cream.',
  },
  {
    token: 'accent',
    dye: 'Kakishibu',
    note: 'Fermented unripe-persimmon tannin. It starts orange-beige and deepens toward chestnut under sun. The only colour here that gets stronger with exposure.',
  },
  {
    token: 'state',
    dye: 'Indigo, first dip',
    note: 'Kamenozoki, peeking into the vat: the palest depth there is. Work in progress has been into the vat once. Work that is finished has been dipped to depth.',
  },
  { token: 'error', dye: 'Akane', note: 'Madder. A signal, never cloth.' },
  {
    token: 'warning',
    dye: 'Kihada',
    note: 'Phellodendron. A signal, never cloth.',
  },
  {
    token: 'success',
    dye: 'Moegi',
    note: 'Fresh-onion green. A signal, never cloth.',
  },
];

const STACK = [
  'React and TypeScript, bundled with Vite',
  'TanStack Router, with each feature owning its own routes',
  'Mantine for interface primitives, themed onto the tokens above',
  'All three faces self-hosted through Fontsource; no runtime font request',
];

/*
 * A modal, not a route. Whether it later earns a URL of its own is not this
 * component's call.
 */
export function Colophon({
  opened,
  onClose,
}: ColophonProps): React.JSX.Element {
  return (
    <Modal
      classNames={{ content: classes.modalContent, title: classes.modalTitle }}
      onClose={onClose}
      opened={opened}
      size="lg"
      title="Colophon"
    >
      <div className={classes.body}>
        {/* TODO(human): the colophon's purpose paragraph. Replace this line with a Prose block; it is not mine to write. */}

        <Rule />

        <section className={classes.section}>
          <h3 className={classes.sectionTitle}>Three faces</h3>
          <dl className={classes.faces}>
            {FACES.map((face) => (
              <div className={classes.face} key={face.name}>
                <dt className={classes.faceName}>{face.name}</dt>
                <dd className={classes.faceRole}>{face.role}</dd>
              </div>
            ))}
          </dl>
        </section>

        <Rule />

        <section className={classes.section}>
          <h3 className={classes.sectionTitle}>Two materials, five dyes</h3>
          <dl className={classes.dyes}>
            {DYES.map((entry) => (
              <div className={classes.dye} key={entry.token}>
                <dt className={classes.dyeName}>
                  <span
                    aria-hidden="true"
                    className={classes.swatch}
                    data-token={entry.token}
                  />
                  {entry.dye}
                </dt>
                <dd className={classes.dyeNote}>{entry.note}</dd>
              </div>
            ))}
          </dl>
        </section>

        <Rule />

        <section className={classes.section}>
          <h3 className={classes.sectionTitle}>The stack</h3>
          <ul className={classes.stack}>
            {STACK.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>
    </Modal>
  );
}
