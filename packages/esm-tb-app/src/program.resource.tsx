import useSWR, { mutate } from 'swr';
import { map as rxjsMap } from 'rxjs/operators';
import { openmrsFetch, openmrsObservableFetch, useConfig } from '@openmrs/esm-framework';
import { ConfigurableProgram, PatientProgram, Program, ProgramsFetchResponse } from './types';
import uniqBy from 'lodash-es/uniqBy';
import filter from 'lodash-es/filter';
import includes from 'lodash-es/includes';
import map from 'lodash-es/map';
import { ConfigObject } from './config-schema';

export const customRepresentation = `custom:(uuid,display,program,dateEnrolled,dateCompleted,location:(uuid,display))`;

export function useEnrollments(patientUuid: string) {
  const enrollmentsUrl = `/ws/rest/v1/programenrollment?patient=${patientUuid}&v=${customRepresentation}`;
  const { data, error, isLoading, isValidating, mutate } = useSWR<{ data: ProgramsFetchResponse }, Error>(
    patientUuid ? enrollmentsUrl : null,
    openmrsFetch,
  );

  const formattedEnrollments =
    data?.data?.results.length > 0
      ? data?.data.results.sort((a, b) => (b.dateEnrolled > a.dateEnrolled ? 1 : -1))
      : null;

  const activeEnrollments = formattedEnrollments?.filter((enrollment) => !enrollment.dateCompleted);

  return {
    data: data ? uniqBy(formattedEnrollments, (program) => program?.program?.uuid) : null,
    isError: error,
    isLoading,
    isValidating,
    activeEnrollments,
    mutateEnrollments: mutate,
  };
}

export function useAvailablePrograms(enrollments?: Array<PatientProgram>) {
  const { data, error, isLoading } = useSWR<{ data: { results: Array<Program> } }, Error>(
    `/ws/rest/v1/program?v=custom:(uuid,display,allWorkflows,concept:(uuid,display))`,
    openmrsFetch,
  );

  const availablePrograms = data?.data?.results ?? null;

  const eligiblePrograms = filter(
    availablePrograms,
    (program) => !includes(map(enrollments, 'program.uuid'), program.uuid),
  );

  return {
    data: availablePrograms,
    isError: error,
    isLoading,
    eligiblePrograms,
  };
}

export function getPatientProgramByUuid(programUuid: string) {
  return openmrsObservableFetch<PatientProgram>(`/ws/rest/v1/programenrollment/${programUuid}`).pipe(
    rxjsMap(({ data }) => data),
  );
}

export function createProgramEnrollment(payload, abortController) {
  if (!payload) {
    return null;
  }
  const { program, patient, dateEnrolled, dateCompleted, location } = payload;
  return openmrsObservableFetch(`/ws/rest/v1/programenrollment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: { program, patient, dateEnrolled, dateCompleted, location },
    signal: abortController.signal,
  });
}

export function updateProgramEnrollment(programEnrollmentUuid: string, payload, abortController) {
  if (!payload && !payload.program) {
    return null;
  }
  const { program, dateEnrolled, dateCompleted, location } = payload;
  return openmrsObservableFetch(`/ws/rest/v1/programenrollment/${programEnrollmentUuid}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: { dateEnrolled, dateCompleted, location },
    signal: abortController.signal,
  });
}

export const useConfigurableProgram = (patientUuid: string) => {
  const { customUrl } = useConfig() as ConfigObject;
  const { data, error, isLoading } = useSWR<{ data: Array<ConfigurableProgram> }>(
    customUrl ? `${customUrl}${patientUuid}` : null,
    openmrsFetch,
  );
  const configurablePrograms = data?.data ?? [];
  return {
    configurablePrograms,
    isLoading,
    error: error,
  };
};

export const usePrograms = (patientUuid: string) => {
  const { customUrl } = useConfig() as ConfigObject;
  const {
    data: enrollments,
    isError: enrollError,
    isLoading: enrolLoading,
    isValidating,
    activeEnrollments,
  } = useEnrollments(patientUuid);
  const { data: availablePrograms, eligiblePrograms } = useAvailablePrograms(enrollments);
  const { configurablePrograms, isLoading: configLoading, error: configError } = useConfigurableProgram(patientUuid);

  const groupProgramsByUUIDandDisplay = [];

  if (availablePrograms) {
    availablePrograms.forEach((program) => {
      const group = groupProgramsByUUIDandDisplay.find(
        (item) => item.uuid === program.uuid && item.display === program.display,
      );

      if (group) {
        // If group exists, add the program to the allocation array
        group.enrollments.push(...enrollments.filter((alloc) => alloc.program.uuid === program.uuid));
      } else {
        // If group doesn't exist, create a new group and add the program to the allocation array
        groupProgramsByUUIDandDisplay.push({
          uuid: program.uuid,
          display: program.display,
          enrollment: enrollments.filter((alloc) => alloc.program.uuid === program.uuid),
        });
      }
    });
  }

  const status = customUrl
    ? { isLoading: configLoading, isError: configError }
    : { isLoading: enrolLoading, isError: enrollError };
  return {
    enrollments,
    ...status,
    isValidating,
    activeEnrollments,
    availablePrograms,
    eligiblePrograms,
    configurablePrograms,
    groupProgramsByUUIDandDisplay,
  };
};
