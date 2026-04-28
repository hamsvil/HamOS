/* eslint-disable no-useless-assignment */
import express from 'express';
import { OmniGraph, ASTSurgeon } from '../../services/supremeTools/ASTEngine';

const router = express.Router();
const omniGraph = new OmniGraph();
const astSurgeon = new ASTSurgeon();

router.post('/trace', (req, res) => {
    try {
        const { filePath } = req.body;
        if (!filePath) return res.status(400).json({ error: 'filePath is required' });
        const deps = omniGraph.traceDependencies(filePath);
        res.json({ dependencies: deps });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/context', (req, res) => {
    try {
        const { filePath } = req.body;
        if (!filePath) return res.status(400).json({ error: 'filePath is required' });
        const ctx = omniGraph.extractSemanticContext(filePath);
        res.json({ context: ctx });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/rename', (req, res) => {
    try {
        const { filePath, oldName, newName } = req.body;
        if (!filePath || !oldName || !newName) return res.status(400).json({ error: 'Missing parameters' });
        const success = astSurgeon.renameSymbol(filePath, oldName, newName);
        res.json({ success });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
