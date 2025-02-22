import React, { useMemo, useState } from 'react';

import moment from 'moment';
import { EncounterList, EncounterListColumn, findObs, getObsFromEncounter } from '@ohri/openmrs-esm-ohri-commons-lib';
import { useTranslation } from 'react-i18next';
import { moduleName } from '../../../index';

interface HtsOverviewListProps {
  patientUuid: string;
}

const hivTestResultConceptUUID = 'e16b0068-b6a2-46b7-aba9-e3be00a7b4ab'; // HIV Result
const htsStrategy = 'f0d85da0-c235-4540-a0d1-63640594f98b';

const HtsOverviewList: React.FC<HtsOverviewListProps> = ({ patientUuid }) => {
  const { t } = useTranslation();
  const [counter, setCounter] = useState(0);
  const htsRetrospectiveTypeUUID = '79c1f50f-f77d-42e2-ad2a-d29304dde2fe'; // HTS Retrospective
  const forceComponentUpdate = () => setCounter(counter + 1);
  const headerTitle = 'HIV Testing Services';

  const columns: EncounterListColumn[] = useMemo(
    () => [
      {
        key: 'date',
        header: t('hivTestDate', 'Date of HIV Test'),
        getValue: (encounter) => {
          return moment(encounter.encounterDatetime).format('DD-MMM-YYYY');
        },
      },
      {
        key: 'location',
        header: t('location', 'Location'),
        getValue: (encounter) => {
          return encounter.location.name;
        },
      },
      {
        key: 'hivTestResult',
        header: t('hivTestResult', 'HIV Test result'),
        getValue: (encounter) => {
          return getObsFromEncounter(encounter, hivTestResultConceptUUID);
        },
      },
      {
        key: 'provider',
        header: t('htsProvider', 'HTS Provider'),
        getValue: (encounter) => {
          return encounter.encounterProviders.map((p) => p.provider.name).join(' | ');
        },
      },

      {
        key: 'actions',
        header: t('actions', 'Actions'),
        getValue: (encounter) => {
          const baseActions = [
            {
              form: { name: 'HTS Client Form' },
              encounterUuid: encounter.uuid,
              intent: '*',
              label: t('viewDetails', 'View Details'),
              mode: 'view',
            },
            {
              form: { name: 'HTS Client Form' },
              encounterUuid: encounter.uuid,
              intent: '*',
              label: t('editForm', 'Edit Form'),
              mode: 'edit',
            },
          ];
          return baseActions;
        },
      },
    ],
    [t],
  );

  return (
    <EncounterList
      patientUuid={patientUuid}
      encounterType={htsRetrospectiveTypeUUID}
      formList={[{ name: 'HTS Client Form' }]}
      columns={columns}
      description={headerTitle}
      headerTitle={headerTitle}
      launchOptions={{
        displayText: 'Add',
        moduleName: moduleName,
      }}
    />
  );
};

export default HtsOverviewList;
