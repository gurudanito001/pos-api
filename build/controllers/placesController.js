"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchPlaces = searchPlaces;
const response_js_1 = require("../lib/response.js");
const NIGERIAN_MARKETS = [
    {
        id: 'loc-balogun',
        title: 'Balogun Market',
        subtitle: 'Lagos Island, Lagos State',
        fullAddress: 'Balogun Market, Lagos Island, Lagos',
        latitude: 6.4552,
        longitude: 3.3841,
        keywords: ['balogun', 'lagos island', 'textiles', 'clothes', 'island'],
    },
    {
        id: 'loc-computer-village',
        title: 'Computer Village (Otigba)',
        subtitle: 'Ikeja, Lagos State',
        fullAddress: 'Computer Village, Otigba St, Ikeja, Lagos',
        latitude: 6.5956,
        longitude: 3.3369,
        keywords: ['computer village', 'otigba', 'ikeja', 'electronics', 'phones'],
    },
    {
        id: 'loc-alaba',
        title: 'Alaba International Market',
        subtitle: 'Ojo, Lagos State',
        fullAddress: 'Alaba International Market, Ojo, Lagos',
        latitude: 6.4619,
        longitude: 3.1931,
        keywords: ['alaba', 'electronics', 'appliances', 'ojo'],
    },
    {
        id: 'loc-tejuosho',
        title: 'Tejuosho Ultra-Modern Market',
        subtitle: 'Yaba, Lagos State',
        fullAddress: 'Tejuosho Market, Ojuelegba Rd, Yaba, Lagos',
        latitude: 6.5085,
        longitude: 3.3667,
        keywords: ['tejuosho', 'yaba', 'boutique', 'clothes'],
    },
    {
        id: 'loc-tradefair',
        title: 'Trade Fair Complex',
        subtitle: 'Badagry Expressway, Lagos State',
        fullAddress: 'Lagos International Trade Fair Complex, Ojo, Lagos',
        latitude: 6.4674,
        longitude: 3.2384,
        keywords: ['trade fair', 'cosmetics', 'auto parts', 'badagry'],
    },
    {
        id: 'loc-idumota',
        title: 'Idumota Market',
        subtitle: 'Lagos Island, Lagos State',
        fullAddress: 'Idumota Market, Lagos Island, Lagos',
        latitude: 6.4589,
        longitude: 3.3831,
        keywords: ['idumota', 'provisions', 'cosmetics', 'lagos island'],
    },
    {
        id: 'loc-wuse',
        title: 'Wuse Market',
        subtitle: 'Wuse 2, Abuja, FCT',
        fullAddress: 'Wuse Market, Kashim Ibrahim Way, Wuse, Abuja',
        latitude: 9.0622,
        longitude: 7.4697,
        keywords: ['wuse', 'abuja', 'fct'],
    },
    {
        id: 'loc-garki',
        title: 'Garki Modern Market',
        subtitle: 'Garki 2, Abuja, FCT',
        fullAddress: 'Garki Modern Market, Damaturu Cres, Garki, Abuja',
        latitude: 9.0234,
        longitude: 7.4891,
        keywords: ['garki', 'abuja'],
    },
    {
        id: 'loc-onitsha',
        title: 'Onitsha Main Market',
        subtitle: 'Onitsha, Anambra State',
        fullAddress: 'Main Market, Bright St, Onitsha, Anambra',
        latitude: 6.1554,
        longitude: 6.7781,
        keywords: ['onitsha', 'main market', 'anambra', 'textiles'],
    },
    {
        id: 'loc-ariaria',
        title: 'Ariaria International Market',
        subtitle: 'Aba, Abia State',
        fullAddress: 'Ariaria International Market, Faulks Rd, Aba, Abia',
        latitude: 5.1278,
        longitude: 7.3489,
        keywords: ['ariaria', 'aba', 'shoes', 'leather', 'bia'],
    },
    {
        id: 'loc-bodija',
        title: 'Bodija Market',
        subtitle: 'Bodija, Ibadan, Oyo State',
        fullAddress: 'Bodija Market, Sango-Eleyele Rd, Ibadan, Oyo',
        latitude: 7.4332,
        longitude: 3.9067,
        keywords: ['bodija', 'ibadan', 'foodstuffs', 'oyo'],
    },
    {
        id: 'loc-kantin-kwari',
        title: 'Kantin Kwari Textile Market',
        subtitle: 'Kano City, Kano State',
        fullAddress: 'Kantin Kwari Market, Ibrahim Taiwo Rd, Kano',
        latitude: 11.9892,
        longitude: 8.5284,
        keywords: ['kantin kwari', 'kano', 'textiles', 'fabrics'],
    },
];
async function searchPlaces(req, res, next) {
    try {
        const query = req.query.query ? String(req.query.query).trim().toLowerCase() : '';
        if (!query) {
            return (0, response_js_1.sendSuccess)(req, res, {
                suggestions: NIGERIAN_MARKETS.slice(0, 5).map(({ keywords, ...rest }) => rest),
            });
        }
        const matches = NIGERIAN_MARKETS.filter((p) => {
            if (p.title.toLowerCase().includes(query))
                return true;
            if (p.subtitle.toLowerCase().includes(query))
                return true;
            if (p.fullAddress.toLowerCase().includes(query))
                return true;
            return p.keywords.some((k) => k.includes(query) || query.includes(k));
        });
        const suggestions = matches.map(({ keywords, ...rest }) => rest);
        return (0, response_js_1.sendSuccess)(req, res, { suggestions });
    }
    catch (err) {
        next(err);
    }
}
