<?php
namespace Api\Core;

class Utils {
    public static function sendResponse(int $statusCode, bool $success, ?string $error = null, $data = null): void {
        http_response_code($statusCode);
        $response = ['success' => $success];
        if ($error !== null) {
            $response['error'] = $error;
        }
        if ($data !== null) {
            if (is_array($data)) {
                $response = array_merge($response, $data);
            } else {
                $response['data'] = $data;
            }
        }
        echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit();
    }

    public static function keysConvert($item, string $mode = 'camel') {
        if (!is_array($item)) {
            return $item;
        }
        $newArray = [];
        foreach ($item as $key => $value) {
            $newKey = ($mode === 'camel') ? self::toCamelCase($key) : self::toSnakeCase($key);
            if (is_array($value)) {
                $newArray[$newKey] = self::keysConvert($value, $mode);
            } else {
                $newArray[$newKey] = $value;
            }
        }
        return $newArray;
    }

    private static function toCamelCase(string $string): string {
        if (strpos($string, '_') === false) {
            return $string;
        }
        $str = str_replace(' ', '', ucwords(str_replace('_', ' ', $string)));
        return lcfirst($str);
    }

    private static function toSnakeCase(string $input): string {
        preg_match_all('![:upper:][:lower:]?|[:lower:]+|[:digit:]+!', $input, $matches);
        $words = $matches[0];
        foreach ($words as &$word) {
            $word = ($word === strtoupper($word)) ? strtolower($word) : lcfirst($word);
        }
        return implode('_', $words);
    }
}
