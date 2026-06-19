<?php

namespace Database\Seeders;

use App\Models\Challenge;
use App\Models\Club;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class TracklifeSeeder extends Seeder
{
    public function run(): void
    {
        Challenge::firstOrCreate(
            ['title' => '7 días registrando comida'],
            [
                'description' => 'Registra todas tus comidas durante 7 días consecutivos.',
                'type' => 'nutrition',
                'start_date' => Carbon::today(),
                'end_date' => Carbon::today()->addDays(30),
                'participant_ids' => [],
                'leaderboard' => [],
                'is_active' => true,
            ]
        );

        Challenge::firstOrCreate(
            ['title' => '30 días sin ultraprocesados'],
            [
                'description' => 'Evita productos NOVA 4 durante 30 días.',
                'type' => 'nutrition',
                'start_date' => Carbon::today(),
                'end_date' => Carbon::today()->addDays(30),
                'participant_ids' => [],
                'leaderboard' => [],
                'is_active' => true,
            ]
        );

        Club::firstOrCreate(
            ['name' => 'TRACKLIFE Transformación'],
            [
                'description' => 'Comunidad principal de transformación física con datos.',
                'owner_id' => 'system',
                'member_ids' => [],
                'is_public' => true,
            ]
        );
    }
}
