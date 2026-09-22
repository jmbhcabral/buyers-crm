-- Canónico
INSERT INTO imoveis_canonicos (
    property_id, titulo, preco, localizacao, descricao, url,
    ad_external_reference, anunciante, referencia_anunciante,
    caracteristicas, caracteristicas_especificas, plantas, videos,
    tours_virtuais, contagens, telefone, raw_json, extraido_em,
    criado_em, atualizado_em
) VALUES (
    '35096897',
    'Apartamento T2 em Lisboa',
    '€ 350.000',
    '["Avenida da Liberdade", "Lisboa", "Portugal"]'::jsonb,
    'Bonito apartamento no centro de Lisboa.',
    'https://www.idealista.pt/imovel/35096897/',
    'REF-123',
    'Remax',
    'XYZ-999',
    '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '[]'::jsonb, '{}'::jsonb,
    '{"numero": "912345678"}'::jsonb,
    '{"propertyId": 35096897}'::jsonb,
    NOW(), NOW(), NOW()
);

-- Versão para o consultor Jorge (consultor_id = 1)
INSERT INTO imoveis_versoes (
    imovel_canonico_id, consultor_id, titulo, preco, localizacao,
    descricao, anunciante, caracteristicas, caracteristicas_especificas,
    telefone, notas_internas, campos_alterados, tem_conflitos,
    sincronizado_em, criado_em, atualizado_em
) VALUES (
    (SELECT id FROM imoveis_canonicos WHERE property_id = '35096897'),
    1,
    'Apartamento T2 em Lisboa',
    '€ 350.000',
    '["Avenida da Liberdade", "Lisboa", "Portugal"]'::jsonb,
    'Bonito apartamento no centro de Lisboa.',
    'Remax',
    '[]'::jsonb, '[]'::jsonb,
    '{"numero": "912345678"}'::jsonb,
    'Cliente prefere visita ao sábado.',
    '{}'::jsonb, false,
    NOW(), NOW(), NOW()
);

-- Fotos (URLs fictícios, ainda sem ficheiros locais)
INSERT INTO fotos (imovel_canonico_id, ordem, url_original, largura, altura, tag, criado_em, atualizado_em)
VALUES
    ((SELECT id FROM imoveis_canonicos WHERE property_id = '35096897'), 0, 'https://example.com/foto1.jpg', 1200, 800, 'living', NOW(), NOW()),
    ((SELECT id FROM imoveis_canonicos WHERE property_id = '35096897'), 1, 'https://example.com/foto2.jpg', 1200, 800, 'quarto', NOW(), NOW());