/**
 * Idempotent ingestion service.
 * Uses findOneAndUpdate with upsert to ensure re-uploading the same document
 * updates existing records instead of duplicating them.
 */

import connectDB from '@/lib/mongodb';
import Track from '@/models/Track';
import Meeting from '@/models/Meeting';
import Race from '@/models/Race';
import Person from '@/models/Person';
import Horse from '@/models/Horse';
import Entry from '@/models/Entry';
import type { ProcessedDocument, ExtractedEntry } from './pdfProcessor';
import type { Types } from 'mongoose';

export interface IngestResult {
  trackId: string;
  meetingId: string;
  racesUpserted: number;
  entriesUpserted: number;
  warnings: string[];
}

export async function ingestDocument(doc: ProcessedDocument): Promise<IngestResult> {
  await connectDB();
  const warnings = [...doc.warnings];

  // 1. Upsert Track
  const track = await Track.findOneAndUpdate(
    { name: doc.meeting.track.name, country: doc.meeting.track.country },
    {
      $set: {
        name: doc.meeting.track.name,
        location: doc.meeting.track.location,
        country: doc.meeting.track.country,
      },
    },
    { upsert: true, new: true }
  );

  // 2. Upsert Meeting
  const meetingDate = new Date(doc.meeting.date);
  const meeting = await Meeting.findOneAndUpdate(
    {
      trackId: track._id,
      date: meetingDate,
      meetingNumber: doc.meeting.meetingNumber,
    },
    {
      $set: {
        trackId: track._id,
        date: meetingDate,
        meetingNumber: doc.meeting.meetingNumber,
        status: 'scheduled',
        'metadata.sourceHash': doc.hash,
      },
    },
    { upsert: true, new: true }
  );

  let racesUpserted = 0;
  let entriesUpserted = 0;

  for (const raceBlock of doc.races) {
    // 3. Upsert Race
    const race = await Race.findOneAndUpdate(
      { meetingId: meeting._id, raceNumber: raceBlock.race.raceNumber },
      {
        $set: {
          meetingId: meeting._id,
          raceNumber: raceBlock.race.raceNumber,
          annualRaceNumber: raceBlock.race.annualRaceNumber,
          llamado: raceBlock.race.llamado,
          distance: raceBlock.race.distance,
          scheduledTime: raceBlock.race.scheduledTime,
          prizePool: raceBlock.race.prizePool,
          bonoPrimerCriador: raceBlock.race.bonoPrimerCriador,
          prizeDistribution: raceBlock.race.prizeDistribution,
          conditions: raceBlock.race.conditions,
          games: raceBlock.race.games,
          status: 'scheduled',
        },
      },
      { upsert: true, new: true }
    );
    racesUpserted++;

    for (const entryData of raceBlock.entries) {
      try {
        const [horse, jockey, trainer] = await Promise.all([
          upsertHorse(entryData),
          upsertPerson(entryData.jockey),
          upsertPerson(entryData.trainer),
        ]);

        // 4. Upsert Entry (idempotent by raceId + dorsalNumber)
        await Entry.findOneAndUpdate(
          { raceId: race._id, dorsalNumber: entryData.dorsalNumber },
          {
            $set: {
              raceId: race._id,
              horseId: horse._id,
              jockeyId: jockey._id,
              trainerId: trainer._id,
              dorsalNumber: entryData.dorsalNumber,
              postPosition: entryData.postPosition,
              weight: entryData.weight,
              weightRaw: entryData.weightRaw,
              medication: entryData.medication,
              implements: entryData.implements,
              status: 'declared',
            },
          },
          { upsert: true, new: true }
        );
        entriesUpserted++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        warnings.push(`Error en entrada dorsal ${entryData.dorsalNumber}: ${msg}`);
      }
    }
  }

  return {
    trackId: (track._id as Types.ObjectId).toString(),
    meetingId: (meeting._id as Types.ObjectId).toString(),
    racesUpserted,
    entriesUpserted,
    warnings,
  };
}

async function upsertHorse(entry: ExtractedEntry) {
  return Horse.findOneAndUpdate(
    { name: entry.horse.name },
    {
      $set: {
        name: entry.horse.name,
        pedigree: entry.horse.pedigree,
        ...(entry.horse.registrationId && { registrationId: entry.horse.registrationId }),
      },
    },
    { upsert: true, new: true }
  );
}

async function upsertPerson(person: ExtractedEntry['jockey'] | ExtractedEntry['trainer']) {
  return Person.findOneAndUpdate(
    { licenseId: person.licenseId, type: person.type },
    {
      $set: {
        name: person.name,
        type: person.type,
        licenseId: person.licenseId,
      },
    },
    { upsert: true, new: true }
  );
}
