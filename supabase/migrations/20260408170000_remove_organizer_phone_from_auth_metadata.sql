update auth.users
set
  raw_user_meta_data = case
    when coalesce(
      nullif(trim(coalesce(raw_user_meta_data ->> 'phone', '')), ''),
      nullif(trim(coalesce(raw_user_meta_data ->> 'organizer_phone', '')), '')
    ) is not null then
      jsonb_set(
        coalesce(raw_user_meta_data, '{}'::jsonb) - 'organizer_phone',
        '{phone}',
        to_jsonb(
          coalesce(
            nullif(trim(coalesce(raw_user_meta_data ->> 'phone', '')), ''),
            nullif(trim(coalesce(raw_user_meta_data ->> 'organizer_phone', '')), '')
          )
        ),
        true
      )
    else
      coalesce(raw_user_meta_data, '{}'::jsonb) - 'organizer_phone'
  end,
  raw_app_meta_data = case
    when coalesce(
      nullif(trim(coalesce(raw_app_meta_data ->> 'phone', '')), ''),
      nullif(trim(coalesce(raw_app_meta_data ->> 'organizer_phone', '')), '')
    ) is not null then
      jsonb_set(
        coalesce(raw_app_meta_data, '{}'::jsonb) - 'organizer_phone',
        '{phone}',
        to_jsonb(
          coalesce(
            nullif(trim(coalesce(raw_app_meta_data ->> 'phone', '')), ''),
            nullif(trim(coalesce(raw_app_meta_data ->> 'organizer_phone', '')), '')
          )
        ),
        true
      )
    else
      coalesce(raw_app_meta_data, '{}'::jsonb) - 'organizer_phone'
  end
where
  coalesce(raw_user_meta_data, '{}'::jsonb) ? 'organizer_phone'
  or coalesce(raw_app_meta_data, '{}'::jsonb) ? 'organizer_phone';
