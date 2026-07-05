<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/database.php';

try {
    $database = new Database();
    $conn = $database->getConnection();

    // Get category IDs
    $stmt = $conn->query("SELECT id, name FROM categories");
    $categories = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $categories[$row['name']] = $row['id'];
    }

    // New questions to add
    $newQuestions = [
        // Géographie - More questions
        ['Géographie', 'Quel pays ne partage pas de frontière avec la RDC ?',
         '["Angola", "Zambie", "Kenya", "Tanzanie"]', 2, 'medium'],
        ['Géographie', 'Quelle est la deuxième plus grande ville de la RDC ?',
         '["Mbuji-Mayi", "Lubumbashi", "Kisangani", "Kananga"]', 1, 'medium'],
        ['Géographie', 'Dans quelle province se trouve le Mont Nyiragongo ?',
         '["Nord-Kivu", "Sud-Kivu", "Katanga", "Équateur"]', 0, 'hard'],
        ['Géographie', 'Quel océan borde la RDC ?',
         '["Océan Indien", "Océan Pacifique", "Océan Atlantique", "Aucun océan"]', 2, 'easy'],
        ['Géographie', 'Quelle ville est surnommée "la ville aux sept collines" ?',
         '["Bukavu", "Goma", "Lubumbashi", "Kinshasa"]', 0, 'hard'],
        ['Géographie', 'Combien de pays partagent une frontière avec la RDC ?',
         '["5", "7", "9", "11"]', 2, 'medium'],
        ['Géographie', 'Quel est le plus grand lac entièrement situé en RDC ?',
         '["Lac Mai-Ndombe", "Lac Tumba", "Lac Upemba", "Lac Moero"]', 0, 'hard'],

        // Histoire - More questions
        ['Histoire', 'Qui était le premier Premier ministre de la RDC ?',
         '["Patrice Lumumba", "Joseph Kasa-Vubu", "Moïse Tshombe", "Cyrille Adoula"]', 0, 'medium'],
        ['Histoire', 'En quelle année Mobutu a-t-il pris le pouvoir ?',
         '["1960", "1963", "1965", "1970"]', 2, 'medium'],
        ['Histoire', 'Comment s\'appelait Kinshasa avant 1966 ?',
         '["Léopoldville", "Stanleyville", "Élisabethville", "Bakwanga"]', 0, 'easy'],
        ['Histoire', 'Quel roi belge a possédé le Congo comme propriété personnelle ?',
         '["Léopold I", "Léopold II", "Albert I", "Baudouin"]', 1, 'medium'],
        ['Histoire', 'En quelle année a eu lieu la conférence de Berlin qui a divisé l\'Afrique ?',
         '["1875", "1884-1885", "1890", "1900"]', 1, 'hard'],
        ['Histoire', 'Qui a assassiné Patrice Lumumba ?',
         '["Des rebelles", "Un complot belgo-américain", "L\'armée congolaise", "Des mercenaires"]', 1, 'hard'],
        ['Histoire', 'Quelle était la devise du Zaïre sous Mobutu ?',
         '["Justice, Paix, Travail", "Unité, Travail, Progrès", "Paix, Justice, Travail", "Authenticité, Travail, Unité"]', 0, 'hard'],

        // Culture - More questions
        ['Culture', 'Combien de langues nationales sont reconnues en RDC ?',
         '["2", "3", "4", "5"]', 2, 'easy'],
        ['Culture', 'Quel artiste est surnommé "Le Sorcier de la Guitare" ?',
         '["Franco Luambo", "Papa Wemba", "Koffi Olomide", "Fally Ipupa"]', 0, 'medium'],
        ['Culture', 'Quelle est la signification de "Muana Mayele" en Lingala ?',
         '["Enfant intelligent", "Grand champion", "Roi du savoir", "Maître du jeu"]', 0, 'easy'],
        ['Culture', 'Quel groupe musical a popularisé le Ndombolo ?',
         '["Wenge Musica", "Zaiko Langa Langa", "OK Jazz", "TPOK Jazz"]', 0, 'medium'],
        ['Culture', 'Comment s\'appelle le pagne traditionnel congolais ?',
         '["Kanga", "Kitenge", "Bogolan", "Kente"]', 1, 'easy'],
        ['Culture', 'Quel est le nom du masque emblématique de la culture Luba ?',
         '["Kifwebe", "Mbala", "Pende", "Songye"]', 0, 'hard'],
        ['Culture', 'Quelle boisson traditionnelle est faite à partir de maïs fermenté ?',
         '["Lotoko", "Lutuku", "Masanga", "Munkoyo"]', 2, 'medium'],

        // Économie - More questions
        ['Économie', 'Quel pourcentage des réserves mondiales de cobalt se trouve en RDC ?',
         '["30%", "50%", "70%", "90%"]', 2, 'hard'],
        ['Économie', 'Quelle province est la plus riche en minerais ?',
         '["Kinshasa", "Katanga/Haut-Katanga", "Nord-Kivu", "Kasaï"]', 1, 'medium'],
        ['Économie', 'Quel est le principal produit agricole d\'exportation de la RDC ?',
         '["Café", "Cacao", "Huile de palme", "Coton"]', 0, 'medium'],
        ['Économie', 'En quelle année le franc congolais a-t-il remplacé le nouveau zaïre ?',
         '["1995", "1997", "1998", "2000"]', 2, 'hard'],
        ['Économie', 'Quel pays est le principal partenaire commercial de la RDC ?',
         '["Belgique", "France", "Chine", "États-Unis"]', 2, 'medium'],

        // Nature - More questions
        ['Nature', 'Quel animal est le symbole national de la RDC ?',
         '["L\'éléphant", "Le léopard", "Le lion", "L\'okapi"]', 3, 'medium'],
        ['Nature', 'Dans quel parc trouve-t-on les bonobos ?',
         '["Virunga", "Salonga", "Kahuzi-Biega", "Garamba"]', 1, 'hard'],
        ['Nature', 'Quel volcan actif se trouve près de Goma ?',
         '["Mont Karisimbi", "Mont Nyiragongo", "Mont Mikeno", "Mont Bisoke"]', 1, 'easy'],
        ['Nature', 'Quelle forêt couvre une grande partie de la RDC ?',
         '["Forêt amazonienne", "Forêt équatoriale du bassin du Congo", "Forêt boréale", "Forêt méditerranéenne"]', 1, 'easy'],
        ['Nature', 'Quel animal unique au monde vit uniquement en RDC ?',
         '["Le gorille", "L\'okapi", "Le chimpanzé", "Le bonobo"]', 1, 'medium'],
        ['Nature', 'Combien de parcs nationaux compte la RDC ?',
         '["3", "5", "8", "10"]', 2, 'hard'],

        // Sport - More questions
        ['Sport', 'En quelle année la RDC (Zaïre) a-t-elle participé à la Coupe du Monde ?',
         '["1970", "1974", "1978", "1982"]', 1, 'medium'],
        ['Sport', 'Quel club congolais a remporté la Ligue des Champions africaine ?',
         '["AS Vita Club", "TP Mazembe", "DC Motema Pembe", "AS Dragons"]', 1, 'easy'],
        ['Sport', 'Combien de fois le TP Mazembe a-t-il remporté la Ligue des Champions CAF ?',
         '["2 fois", "3 fois", "5 fois", "7 fois"]', 2, 'medium'],
        ['Sport', 'Quel boxeur congolais a été champion du monde poids lourds ?',
         '["Martin Bakole", "Junior Makabu", "David Tua", "Corrie Sanders"]', 1, 'hard'],
        ['Sport', 'Dans quelle ville se trouve le Stade des Martyrs ?',
         '["Lubumbashi", "Kinshasa", "Mbuji-Mayi", "Kisangani"]', 1, 'easy'],

        // Éducation - More questions
        ['Éducation', 'Quel système éducatif suit la RDC ?',
         '["Américain", "Français", "Belge", "Britannique"]', 2, 'medium'],
        ['Éducation', 'Combien d\'années dure l\'école primaire en RDC ?',
         '["4 ans", "5 ans", "6 ans", "7 ans"]', 2, 'easy'],
        ['Éducation', 'Comment s\'appelle l\'examen national de fin d\'études secondaires ?',
         '["BAC", "TENAFEP", "Examen d\'État", "BEPC"]', 2, 'easy'],
        ['Éducation', 'Quelle langue d\'enseignement est utilisée au primaire ?',
         '["Français uniquement", "Langues nationales puis français", "Anglais", "Lingala uniquement"]', 1, 'medium']
    ];

    $inserted = 0;
    $errors = [];

    foreach ($newQuestions as $q) {
        $categoryName = $q[0];
        $categoryId = $categories[$categoryName] ?? null;

        if (!$categoryId) {
            $errors[] = "Category not found: $categoryName";
            continue;
        }

        // Check if question already exists
        $checkStmt = $conn->prepare("SELECT id FROM questions WHERE question = ?");
        $checkStmt->execute([$q[1]]);
        if ($checkStmt->fetch()) {
            continue; // Question already exists
        }

        $stmt = $conn->prepare("
            INSERT INTO questions (category_id, question, options, correct_answer, difficulty)
            VALUES (?, ?, ?, ?, ?)
        ");

        try {
            $stmt->execute([$categoryId, $q[1], $q[2], $q[3], $q[4]]);
            $inserted++;
        } catch (PDOException $e) {
            $errors[] = $e->getMessage();
        }
    }

    // Count total questions
    $stmt = $conn->query("SELECT COUNT(*) as total FROM questions");
    $total = $stmt->fetch(PDO::FETCH_ASSOC)['total'];

    echo json_encode([
        'success' => true,
        'message' => "Added $inserted new questions",
        'total_questions' => $total,
        'errors' => $errors
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
