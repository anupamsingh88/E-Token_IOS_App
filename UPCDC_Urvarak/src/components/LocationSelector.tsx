import { apiFetch } from '../utils/apiClient';
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import Dropdown from './Dropdown/Dropdown';
import { API_ENDPOINTS } from '../config/config';
import { COLORS, SPACING } from '../constants';

interface LocationItem {
    id: string;
    name: string;
    name_en?: string;
    name_hi?: string;
}

interface LocationSelectorProps {
    onLocationChange: (locationData: {
        state: string;
        district: string;
        block: string;
        tehsil: string;
        village: string;
    }) => void;
}

export default function LocationSelector({ onLocationChange }: LocationSelectorProps) {
    const [states, setStates] = useState<LocationItem[]>([]);
    const [districts, setDistricts] = useState<LocationItem[]>([]);
    const [blocks, setBlocks] = useState<LocationItem[]>([]);
    const [tehsils, setTehsils] = useState<LocationItem[]>([]);
    const [villages, setVillages] = useState<LocationItem[]>([]);

    const [selectedState, setSelectedState] = useState('');
    const [selectedDistrict, setSelectedDistrict] = useState('');
    const [selectedBlock, setSelectedBlock] = useState('');
    const [selectedTehsil, setSelectedTehsil] = useState('');
    const [selectedVillage, setSelectedVillage] = useState('');

    const [loading, setLoading] = useState<{ [key: string]: boolean }>({});

    useEffect(() => {
        // Automatically set state and fetch districts for Uttar Pradesh
        setSelectedState('Uttar Pradesh');
        fetchLocations('districts', 'Uttar Pradesh');
    }, []);

    useEffect(() => {
        onLocationChange({
            state: selectedState,
            district: selectedDistrict,
            block: selectedBlock,
            tehsil: selectedTehsil,
            village: selectedVillage
        });
    }, [selectedState, selectedDistrict, selectedBlock, selectedTehsil, selectedVillage]);

    const fetchLocations = async (type: string, parentId?: string) => {
        setLoading(prev => ({ ...prev, [type]: true }));
        try {
            let url = `${API_ENDPOINTS.getLocations}?type=${type}`;
            if (parentId) {
                url += `&parent_id=${parentId}`;
            }
            const response = await apiFetch(url);
            const result = await response.json();

            if (result.success) {
                switch (type) {
                    case 'state': setStates(result.data); break;
                    case 'districts': setDistricts(result.data); break;
                    case 'blocks': setBlocks(result.data); break;
                    case 'tehsils': setTehsils(result.data); break;
                    case 'villages': setVillages(result.data); break;
                }
            }
        } catch (error) {
            console.error(`Error fetching ${type}:`, error);
        } finally {
            setLoading(prev => ({ ...prev, [type]: false }));
        }
    };

    const handleStateChange = (id: string | number) => {
        const idStr = String(id);
        const selected = states.find(s => s.id == idStr);
        setSelectedState(selected ? (selected.name_hi || selected.name) : idStr);

        setSelectedDistrict('');
        setSelectedBlock('');
        setSelectedTehsil('');
        setSelectedVillage('');
        setDistricts([]);
        setBlocks([]);
        setTehsils([]);
        setVillages([]);
        if (idStr) fetchLocations('districts', idStr);
    };

    const handleDistrictChange = (id: string | number) => {
        const idStr = String(id);
        const selected = districts.find(d => d.id == idStr);
        setSelectedDistrict(selected ? (selected.name_hi || selected.name) : idStr);

        setSelectedBlock('');
        setSelectedTehsil('');
        setSelectedVillage('');
        setBlocks([]);
        setTehsils([]);
        setVillages([]);
        if (idStr) {
            fetchLocations('tehsils', idStr);
            fetchLocations('blocks', idStr);
        }
    };

    const handleTehsilChange = (id: string | number) => {
        const idStr = String(id);
        const selected = tehsils.find(t => t.id == idStr);
        setSelectedTehsil(selected ? (selected.name_hi || selected.name) : idStr);
    };

    const handleBlockChange = (id: string | number) => {
        const idStr = String(id);
        const selected = blocks.find(b => b.id == idStr);
        setSelectedBlock(selected ? (selected.name_hi || selected.name) : idStr);

        setSelectedVillage('');
        setVillages([]);
        if (idStr) fetchLocations('villages', idStr);
    };

    const handleVillageChange = (id: string | number) => {
        const idStr = String(id);
        const selected = villages.find(v => v.id == idStr);
        setSelectedVillage(selected ? (selected.name_hi || selected.name) : idStr);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>स्थान विवरण (Location Details)</Text>

            {/* State is fixed to Uttar Pradesh, so no dropdown rendered */}

            <Dropdown
                label="ज़िला (District)"
                placeholder="ज़िला चुनें"
                options={districts.map(d => ({ label: d.name_hi || d.name, value: d.id }))}
                value={districts.find(d => (d.name_hi || d.name) === selectedDistrict)?.id || ''}
                onSelect={handleDistrictChange}
                disabled={!selectedState || loading.districts}
            />

            <Dropdown
                label="तहसील (Tehsil)"
                placeholder="तहसील चुनें"
                options={tehsils.map(t => ({ label: t.name_hi || t.name, value: t.id }))}
                value={tehsils.find(t => (t.name_hi || t.name) === selectedTehsil)?.id || ''}
                onSelect={handleTehsilChange}
                disabled={!selectedDistrict || loading.tehsils}
            />

            <Dropdown
                label="ब्लॉक (Block)"
                placeholder="ब्लॉक चुनें"
                options={blocks.map(b => ({ label: b.name_hi || b.name, value: b.id }))}
                value={blocks.find(b => (b.name_hi || b.name) === selectedBlock)?.id || ''}
                onSelect={handleBlockChange}
                disabled={!selectedDistrict || loading.blocks}
            />

            <Dropdown
                label="गाँव (Village)"
                placeholder="गाँव चुनें"
                options={villages.map(v => ({ label: v.name_hi || v.name, value: v.id }))}
                value={villages.find(v => (v.name_hi || v.name) === selectedVillage)?.id || ''}
                onSelect={handleVillageChange}
                disabled={!selectedBlock || loading.villages}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: SPACING.md,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginBottom: SPACING.sm,
        marginTop: SPACING.md,
    }
});
