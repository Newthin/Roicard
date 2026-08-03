<?php

namespace App\Socialite;

use Laravel\Socialite\Two\AbstractProvider;
use Laravel\Socialite\Two\ProviderInterface;
use Laravel\Socialite\Two\User;

class InstagramProvider extends AbstractProvider implements ProviderInterface
{
    protected $scopeSeparator = ' ';

    protected $scopes = ['user_profile'];

    protected function getAuthUrl($state)
    {
        return $this->buildAuthUrlFromBase('https://api.instagram.com/oauth/authorize', $state);
    }

    protected function getTokenUrl()
    {
        return 'https://api.instagram.com/oauth/access_token';
    }

    protected function getUserByToken($token)
    {
        $response = $this->getHttpClient()->get('https://graph.instagram.com/me', [
            'query' => [
                'fields' => 'id,username,account_type,media_count',
                'access_token' => $token,
            ],
        ]);

        return json_decode($response->getBody(), true);
    }

    protected function mapUserToObject(array $user)
    {
        return (new User)->setRaw($user)->map([
            'id' => $user['id'] ?? null,
            'nickname' => $user['username'] ?? null,
            'name' => $user['username'] ?? null,
            'avatar' => null,
        ]);
    }

    protected function getTokenFields($code)
    {
        return array_merge(parent::getTokenFields($code), [
            'grant_type' => 'authorization_code',
        ]);
    }
}
