'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HiOutlineChevronDown, HiOutlineChevronUp } from 'react-icons/hi2';
import MigrationErrorBoundary from './MigrationErrorBoundary';

interface TrainingResourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TrainingSection = 'warmup';

const TrainingResourcesModal: React.FC<TrainingResourcesModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [expandedSection, setExpandedSection] = useState<TrainingSection | null>('warmup');

  if (!isOpen) return null;

  type ListItem = string | { title: string; subPoints?: ListItem[] }; 

  const renderListItems = (items: string | ListItem[], itemKeyPrefix: string, level = 1): React.ReactNode => {
    let actualItems: ListItem[];
    if (typeof items === 'string') {
        const fetchedItems = t(items, { returnObjects: true });
        if (!Array.isArray(fetchedItems)) return null;
      actualItems = fetchedItems as ListItem[];
    } else {
      actualItems = items;
    }

    return actualItems.map((item: ListItem, index: number) => {
      const key = `${itemKeyPrefix}-${index}`;
      const currentPadding = `pl-${2 + level * 2}`;

      if (typeof item === 'object' && item !== null && item.title) {
        return (
          <li key={key}>
            {item.title}
            {item.subPoints && Array.isArray(item.subPoints) && item.subPoints.length > 0 && (
              <ul className={`list-disc list-inside space-y-1 ${currentPadding} mt-1`}> 
                {renderListItems(item.subPoints, key, level + 1)}
              </ul>
            )}
          </li>
        );
      }
      return <li key={key}>{String(item)}</li>;
    });
  };

  const toggleSection = (section: TrainingSection) => {
    setExpandedSection(prev => (prev === section ? null : section));
  };

  const sections: { key: TrainingSection; titleKey: string }[] = [
    { key: 'warmup', titleKey: 'trainingResourcesModal.navWarmup' },
  ];

  return (
    <div role="dialog" className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] font-display">
      <div className="bg-slate-800 flex flex-col h-full w-full bg-noise-texture relative overflow-hidden">
        {/* Header */}
        <div className="flex justify-center items-center pt-10 pb-4 px-6 backdrop-blur-sm bg-slate-900/20 border-b border-slate-700/20 flex-shrink-0">
          <h2 className="text-3xl font-bold text-yellow-400 tracking-wide drop-shadow-lg">
            {t('trainingResourcesModal.title', 'Training Resources')}
          </h2>
        </div>
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 space-y-2">
          {sections.map((section) => {
            const isExpanded = expandedSection === section.key;
            return (
              <div key={section.key} className="bg-slate-900/70 border border-slate-700 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleSection(section.key)}
                  className="w-full flex justify-between items-center p-3 text-left bg-slate-800/50 hover:bg-slate-700/80 transition-colors"
                  aria-expanded={isExpanded}
                >
                  <span className="font-semibold text-lg text-slate-100">{t(section.titleKey)}</span>
                  {isExpanded ? <HiOutlineChevronUp className="w-5 h-5 text-slate-400"/> : <HiOutlineChevronDown className="w-5 h-5 text-slate-400"/>}
                </button>
                
                {isExpanded && (
                  <div className="p-4 text-sm sm:text-base border-t border-slate-700">
                    {section.key === 'warmup' && (
                        <div className="space-y-6">
                        <h3 className="text-xl font-semibold text-yellow-300">{t('warmup.title')}</h3>
                        <section>
                          <h4 className="text-lg font-bold mb-2 text-yellow-200">{t('warmup.section1Title')}</h4>
                          <ul className="list-disc list-inside space-y-1.5 pl-2">{renderListItems(t('warmup.section1Points', { returnObjects: true }) as ListItem[], 's1')}</ul>
                        </section>
                        <section>
                            <h4 className="text-lg font-bold mb-2 text-yellow-200">{t('warmup.section2Title')}</h4>
                          <ul className="list-disc list-inside space-y-1.5 pl-2">{renderListItems(t('warmup.section2Activities', { returnObjects: true }) as ListItem[], 's2')}</ul>
                          </section>
                          <section>
                            <h4 className="text-lg font-bold mb-2 text-yellow-200">{t('warmup.section3Title')}</h4>
                          <ul className="list-disc list-inside space-y-1.5 pl-2">{renderListItems(t('warmup.section3PairWorkPoints', { returnObjects: true }) as ListItem[], 's3')}</ul>
                          </section>
                          <section>
                            <h4 className="text-lg font-bold mb-2 text-yellow-200">{t('warmup.section3GoalieWarmup')}</h4>
                          <ul className="list-disc list-inside space-y-1.5 pl-2">{renderListItems(t('warmup.section3GoalieWarmupPoints', { returnObjects: true }) as ListItem[], 's4')}</ul>
                          </section>
                          <section>
                            <h4 className="text-lg font-bold mb-2 text-yellow-200">{t('warmup.section3CombinedGoalieWarmup')}</h4>
                          <ul className="list-disc list-inside space-y-1.5 pl-2">{renderListItems(t('warmup.section3CombinedGoalieWarmupPoints', { returnObjects: true }) as ListItem[], 'dg')}</ul>
                          </section>
                          <section>
                            <h4 className="text-lg font-bold mb-2 text-yellow-200">{t('warmup.section4Title')}</h4>
                          <ul className="list-disc list-inside space-y-1.5 pl-2">{renderListItems(t('warmup.section4Points', { returnObjects: true }) as ListItem[], 's5')}</ul>
                          </section>
                          <section>
                            <h4 className="text-lg font-bold mb-2 text-yellow-200">{t('warmup.duringGameTitle')}</h4>
                          <ul className="list-disc list-inside space-y-1.5 pl-2">{renderListItems(t('warmup.duringGamePoints', { returnObjects: true }) as ListItem[], 's6')}</ul>
                          </section>
                        </div>
                    )}
                  </div>
                )}
              </div>
            );
          })} 
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-800/50 border-t border-slate-700/20 backdrop-blur-sm flex justify-end items-center gap-4 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors">
            {t('common.doneButton', 'Done')}
          </button>
        </div>
      </div>
    </div>
  );
};

// Wrapped component with error boundary
const TrainingResourcesModalWithErrorBoundary: React.FC<TrainingResourcesModalProps> = (props) => (
  <MigrationErrorBoundary componentName="TrainingResourcesModal">
    <TrainingResourcesModal {...props} />
  </MigrationErrorBoundary>
);

export default TrainingResourcesModalWithErrorBoundary; 