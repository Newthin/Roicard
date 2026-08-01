<?php

namespace App\Support\MediaLibrary;

use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Spatie\MediaLibrary\Support\PathGenerator\DefaultPathGenerator;

class AvatarPathGenerator extends DefaultPathGenerator
{
    public function getPath(Media $media): string
    {
        if ($media->collection_name === 'avatar') {
            $profile = $media->model;
            $userId = $profile->user_id ?? $profile->id;
            return 'avatars/'.$userId.'/';
        }
        return parent::getPath($media);
    }

    public function getPathForConversions(Media $media): string
    {
        if ($media->collection_name === 'avatar') {
            return $this->getPath($media).'conversions/';
        }
        return parent::getPathForConversions($media);
    }

    public function getPathForResponsiveImages(Media $media): string
    {
        if ($media->collection_name === 'avatar') {
            return $this->getPath($media).'responsive-images/';
        }
        return parent::getPathForResponsiveImages($media);
    }
}
