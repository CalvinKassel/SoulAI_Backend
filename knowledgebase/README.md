# SoulAI Knowledge Base

This directory contains the dynamic knowledge base for SoulAI's RAG (Retrieval-Augmented Generation) system. The system automatically ingests new `.md` files and makes them available to the AI agents.

## Structure

### Core Knowledge (`core/`)
- **personality/**: MBTI, Big Five, Enneagram, attachment styles
- **compatibility/**: Matching algorithms, personality alignment
- **psychology/**: Emotional intelligence, cognitive patterns, behavior

### Hex Code Dimensions (`hexcode-dimensions/`)
Based on the Human Hex Code compatibility system:

#### Metaphysical Core (`metaphysical-core/`)
The HUE dimension (0-360°) representing core personality archetype:
- `cognitive-intellectual.md` - Hue 0°
- `inventive-analytical.md` - Hue 45°
- `action-creative.md` - Hue 90°
- `empathetic-collaborative.md` - Hue 135°
- `relational-emotional.md` - Hue 180°
- `insightful-transformative.md` - Hue 225°
- `purpose-growth.md` - Hue 270°
- `contemplative-visionary.md` - Hue 315°

#### Manifested Self (`manifested-self/`)
The second dimension (0-255) representing behavioral expression:
- `social-engagement.md`
- `emotional-regulation.md`
- `life-satisfaction.md`
- `adaptability.md`
- `proactivity.md`

#### Human Soul (`human-soul/`)
The third dimension (0-255) representing spiritual/existential depth:
- `existential-awareness.md`
- `transcendence-capacity.md`
- `authenticity.md`
- `moral-integration.md`
- `unconditional-love.md`

### Relationships (`relationships/`)
- **stages/**: Attraction, dating, commitment, long-term
- **communication/**: Patterns, conflict resolution, love languages
- **coaching/**: Advice, personal growth, intimacy building

### Matching (`matching/`)
- **algorithms/**: Compatibility scoring, weighted matching
- **strategies/**: Soulmate matching, complementary pairs

### Specialized (`specialized/`)
- **therapeutic/**: Attachment healing, trauma-informed approaches
- **cultural/**: Cultural compatibility, values systems
- **developmental/**: Life stage compatibility, personal evolution

## Usage

### Adding New Knowledge
1. Create a new `.md` file in the appropriate folder
2. The system automatically detects and processes the file
3. Knowledge becomes immediately available to AI agents

### File Format
```markdown
---
tags: [personality, compatibility, relationships]
---

# File Title

Your content here...

## Sections

Use clear headings and structure for better processing.
```

### Querying Knowledge
The RAG system can be queried by:
- Hex code dimension
- Category
- Keywords
- Similarity threshold

## Auto-Ingestion Features

- **File Watching**: Automatically detects new/modified files
- **Metadata Extraction**: Extracts categories, tags, and structure
- **Embedding Generation**: Creates searchable vectors (OpenAI or fallback)
- **Hex Code Mapping**: Maps knowledge to specific personality dimensions
- **Weighted Scoring**: Prioritizes knowledge based on relevance

## Integration

The knowledge base integrates with:
- `HumanHexCodeMatcher` for personality-specific insights
- `SoulAIOrchestrator` for agent coordination
- `CompatibilityAgent` for matching algorithms
- `PersonalityAnalysisAgent` for trait analysis

## Performance

- **Vector Storage**: In-memory for fast retrieval
- **Chunking**: Automatic content segmentation
- **Caching**: Similarity calculations cached
- **Fallback**: Works without OpenAI API

Add your `.md` files to any folder and SoulAI will automatically absorb the knowledge!