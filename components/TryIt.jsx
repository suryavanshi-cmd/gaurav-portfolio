'use client';

import { useState } from 'react';
import { DemoCard } from './cards';
import { Segmented, SpotlightGroup } from './ui';

/* The home page's "Try it" shelf: one switch between everyday tools and
   learn-by-playing games. Keyed on the choice, so the cards rise in again
   each time it changes. */
export default function TryIt({ tools, games }) {
  const [tab, setTab] = useState('tools');
  const list = tab === 'tools' ? tools : games;

  return (
    <>
      <div className="try-switch">
        <Segmented
          label="Show"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'tools', label: 'Everyday tools', count: tools.length },
            { value: 'games', label: 'Learn by playing', count: games.length },
          ]}
        />
      </div>
      <SpotlightGroup>
        <div className="grid grid-3 try-grid" key={tab}>
          {list.map((tool) => <DemoCard key={tool.slug} tool={tool} />)}
        </div>
      </SpotlightGroup>
    </>
  );
}
