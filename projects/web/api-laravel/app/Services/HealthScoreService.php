<?php

namespace App\Services;

class HealthScoreService
{
    public function calculate(array $nutriments, ?int $novaGroup = null, ?string $ingredients = null): array
    {
        $score = 70;
        $alerts = [];

        $sugars = (float) ($nutriments['sugars_100g'] ?? $nutriments['sugars'] ?? 0);
        $salt = (float) ($nutriments['salt_100g'] ?? $nutriments['salt'] ?? 0);
        $saturated = (float) ($nutriments['saturated-fat_100g'] ?? $nutriments['saturated_fat'] ?? 0);
        $fiber = (float) ($nutriments['fiber_100g'] ?? $nutriments['fiber'] ?? 0);
        $protein = (float) ($nutriments['proteins_100g'] ?? $nutriments['proteins'] ?? 0);

        if ($sugars > 15) {
            $score -= 15;
            $alerts[] = 'Alto en azúcares';
        } elseif ($sugars > 8) {
            $score -= 8;
            $alerts[] = 'Azúcares moderados';
        }

        if ($salt > 1.5) {
            $score -= 12;
            $alerts[] = 'Alto en sal';
        }

        if ($saturated > 5) {
            $score -= 10;
            $alerts[] = 'Alto en grasas saturadas';
        }

        if ($fiber >= 3) {
            $score += 8;
        }

        if ($protein >= 10) {
            $score += 5;
        }

        if ($novaGroup === 4) {
            $score -= 20;
            $alerts[] = 'Ultraprocesado (NOVA 4)';
        } elseif ($novaGroup === 3) {
            $score -= 10;
            $alerts[] = 'Procesado (NOVA 3)';
        }

        if ($ingredients) {
            $lower = strtolower($ingredients);
            foreach (['aspartamo', 'acesulfamo', 'sacarina', 'edulcorante'] as $additive) {
                if (str_contains($lower, $additive)) {
                    $score -= 5;
                    $alerts[] = 'Contiene edulcorantes';
                    break;
                }
            }
        }

        $score = max(0, min(100, (int) round($score)));

        return [
            'health_score' => $score,
            'alerts' => array_values(array_unique($alerts)),
        ];
    }
}
