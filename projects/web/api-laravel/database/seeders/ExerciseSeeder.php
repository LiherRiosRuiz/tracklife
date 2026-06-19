<?php

namespace Database\Seeders;

use App\Models\Exercise;
use Illuminate\Database\Seeder;

class ExerciseSeeder extends Seeder
{
    private const IMAGE_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

    public function run(): void
    {
        $path = database_path('data/exercises.json');

        if (! file_exists($path)) {
            $this->command->error('exercises.json not found at '.$path);

            return;
        }

        $exercises = json_decode(file_get_contents($path), true);

        foreach ($exercises as $entry) {
            Exercise::updateOrCreate(
                ['external_id' => $entry['id']],
                [
                    'name' => $entry['name'],
                    'muscle_group' => $entry['primaryMuscles'][0] ?? 'other',
                    'equipment' => $entry['equipment'] ?? 'body only',
                    'category' => $entry['category'] ?? 'strength',
                    'is_custom' => false,
                    'instructions' => $entry['instructions'] ?? [],
                    'tips' => [],
                    'image_url' => isset($entry['images'][0])
                        ? self::IMAGE_BASE.$entry['images'][0]
                        : null,
                    'muscles_primary' => $entry['primaryMuscles'] ?? [],
                    'muscles_secondary' => $entry['secondaryMuscles'] ?? [],
                    'force' => $entry['force'] ?? null,
                    'level' => $entry['level'] ?? null,
                    'mechanic' => $entry['mechanic'] ?? null,
                    'external_id' => $entry['id'],
                ]
            );
        }

        $this->command->info('Seeded '.count($exercises).' exercises.');
    }
}
