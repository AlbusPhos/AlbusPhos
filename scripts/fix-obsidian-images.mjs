#!/usr/bin/env node
/**
 * fix-obsidian-images.mjs
 *
 * 把 Obsidian 粘贴产生的 wikilink 图片 `![[foo.png]]` 改写为三端通用写法：
 *   ![foo](<相对该 md 文件的 POSIX 路径，空格/中文已转义>)
 * Obsidian ✅ / GitHub ✅ / Astro ✅（Astro 只认相对路径，不认 ![[ ]]）。
 *
 * 约定（见 AGENTS.md）：
 * - 不重命名文件，仅转义路径中的空格与非 ASCII 字符（%20 等）。
 * - 路径相对笔记所在目录计算，不硬编码 /AlbusPhos/... 前缀。
 * - 输出统一用 <...> 包裹路径，规避文件名中圆括号破坏 ![]() 语法。
 * - 只处理图片扩展名，PDF / 音频等非图片 wikilink 一律跳过，不误转成 <img>。
 * - 幂等：已是标准 ![]() 的不动，可反复跑。
 *
 * 用法：
 *   node scripts/fix-obsidian-images.mjs                # dry-run，只打印将改什么
 *   node scripts/fix-obsidian-images.mjs --write         # 落盘（要求工作区干净，见 --force）
 *   node scripts/fix-obsidian-images.mjs --check         # 有残留 ![[ 则 exit 1（人肉确认 / CI 用）
 *   node scripts/fix-obsidian-images.mjs --strict        # 存在无法解析的图片引用也视为失败
 *   node scripts/fix-obsidian-images.mjs --json          # 以 JSON 输出结果，便于机器消费
 *   node scripts/fix-obsidian-images.mjs --write --force # 跳过“工作区必须干净”的保护检查
 *
 * 退出码：
 *   0 正常
 *   1 校验失败（--check / --strict 触发）
 *   2 脚本自身错误 / 用法错误（参数冲突、目录不存在、未捕获异常等）
 */
import {
	readdirSync,
	readFileSync,
	statSync,
	writeFileSync,
	renameSync,
	unlinkSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_DIR = path.join(ROOT, 'src', 'content');
const FALLBACK_ATTACH = path.join(ROOT, 'src', 'assets', 'attachments');

const ARGS = new Set(process.argv.slice(2));
const WRITE = ARGS.has('--write');
const CHECK = ARGS.has('--check');
const STRICT = ARGS.has('--strict');
const JSON_OUT = ARGS.has('--json');
const FORCE = ARGS.has('--force');
const HELP = ARGS.has('--help') || ARGS.has('-h');

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.astro', '.obsidian']);
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.avif']);
const NOTE_EXT_RE = /\.(md|mdx)$/i;

function printHelp() {
	console.log(`用法：node scripts/fix-obsidian-images.mjs [选项]

选项：
  --write    落盘改写（默认 dry-run，只打印不改文件）
  --check    若仍有 ![[ 残留则 exit 1，不与 --write 同次调用
  --strict   存在无法解析的图片引用（missing）也视为失败
  --json     以 JSON 格式输出结果报告
  --force    跳过“工作区必须 git-clean”的保护检查
  --help     打印本帮助
`);
}

/** .obsidian/app.json -> attachmentFolderPath（读不到则用默认中央目录） */
function getAttachmentDir() {
	try {
		const raw = readFileSync(path.join(ROOT, '.obsidian', 'app.json'), 'utf8');
		const folder = JSON.parse(raw)?.attachmentFolderPath;
		if (typeof folder === 'string' && folder.trim()) return path.resolve(ROOT, folder);
	} catch {
		/* ignore: fallback below */
	}
	return FALLBACK_ATTACH;
}
const ATTACH_DIR = getAttachmentDir();

/** 通用递归遍历，统一跳过 SKIP_DIRS，避免 collectNotes / buildImageIndex 各写一份 */
function walkFiles(dir, predicate) {
	const out = [];
	const walk = (d) => {
		let entries;
		try {
			entries = readdirSync(d);
		} catch {
			return;
		}
		for (const name of entries) {
			if (SKIP_DIRS.has(name)) continue;
			const p = path.join(d, name);
			let st;
			try {
				st = statSync(p);
			} catch {
				continue;
			}
			if (st.isDirectory()) walk(p);
			else if (st.isFile() && predicate(name)) out.push(p);
		}
	};
	walk(dir);
	return out;
}

/** 全仓建 basename -> 绝对路径索引，用于“裸文件名”定位 */
function buildImageIndex() {
	const files = walkFiles(ROOT, (name) => IMAGE_EXTS.has(path.extname(name).toLowerCase()));
	const index = new Map();
	for (const p of files) {
		const base = path.basename(p);
		if (!index.has(base)) index.set(base, []);
		index.get(base).push(p);
	}
	return index;
}

/** 收集 src/content 下的 md/mdx（复用 walkFiles，自动排除 SKIP_DIRS） */
function collectNotes() {
	return walkFiles(CONTENT_DIR, (name) => NOTE_EXT_RE.test(name)).sort();
}

/** 逐段转义：空格/中文 -> %20/%XX，保留 '/' 分隔 */
function encodeRel(p) {
	return p
		.split('/')
		.map((seg) => encodeURIComponent(seg))
		.join('/');
}

const WIKILINK_RE = /!\[\[([^\]\n]+?)\]\]/g;
const SIZE_RE = /^\d+(x\d+)?$/;

function parseInner(inner) {
	const parts = inner.split('|').map((s) => s.trim());
	const target = parts[0];
	let alt = null;
	for (const part of parts.slice(1)) {
		if (SIZE_RE.test(part.replace(/\s+/g, ''))) continue; // |600 / |600x400：标准 MD 无宽度语义，转写时丢弃
		alt = part;
	}
	return { target, alt, droppedSize: parts.slice(1).some((p) => SIZE_RE.test(p.replace(/\s+/g, ''))) };
}

/** 拒绝解析结果落在仓库外，防止路径穿越 / 奇怪的绝对路径泄露进内容 */
function isInsideRepo(abs) {
	const rel = path.relative(ROOT, abs);
	return !!rel && !rel.startsWith('..') && !path.isAbsolute(rel);
}

function statFileOrNull(p) {
	try {
		return statSync(p).isFile() ? p : null;
	} catch {
		return null;
	}
}

function resolveTarget(noteDir, target, index) {
	if (!target) return { abs: null, reason: '空目标' };

	const norm = target.replace(/\\/g, '/');
	const ext = path.extname(norm).toLowerCase();

	// 非图片扩展名（PDF / mp3 / 纯笔记 transclusion 等）一律跳过，不当图片处理
	if (ext && !IMAGE_EXTS.has(ext)) {
		return { abs: null, reason: `非图片扩展名（${ext}），可能是文件/笔记嵌入，已跳过` };
	}
	// 不带扩展名的 ![[笔记标题]] / ![[笔记#^block]] 也跳过
	if (!ext) {
		return { abs: null, reason: '非图片目标（无扩展名，疑似笔记/块嵌入），已跳过' };
	}

	const base = path.basename(norm);
	// 1. vault 根相对路径（以 '/' 开头）单独处理，不能直接丢给 path.resolve(noteDir, ...)
	const primaryCandidate = norm.startsWith('/')
		? path.resolve(ROOT, norm.slice(1))
		: path.resolve(noteDir, norm);

	let hit = statFileOrNull(primaryCandidate);

	// 2. Obsidian 附件目录（全路径 + 仅 basename 两试）
	if (!hit) {
		for (const cand of [path.resolve(ATTACH_DIR, norm), path.resolve(ATTACH_DIR, base)]) {
			hit = statFileOrNull(cand);
			if (hit) break;
		}
	}

	// 3. 全仓同名索引
	let warning;
	if (!hit) {
		const hits = index.get(base) ?? [];
		if (hits.length === 1) {
			hit = hits[0];
		} else if (hits.length > 1) {
			const preferred = hits.find((h) => h.startsWith(ATTACH_DIR + path.sep)) ?? hits[0];
			hit = preferred;
			warning = `重名 ${hits.length} 处，选用 ${path.relative(ROOT, preferred)}`;
		}
	}

	if (!hit) {
		return {
			abs: null,
			reason: `找不到文件（已查笔记相对目录 / ${path.relative(ROOT, ATTACH_DIR)} / 全仓索引）`,
		};
	}
	if (!isInsideRepo(hit)) {
		return { abs: null, reason: '解析结果位于仓库外，已拒绝（疑似路径穿越）' };
	}
	return { abs: hit, warning };
}

/** 写临时文件再 rename，避免进程中途被杀导致文件被截断成半截 */
function atomicWrite(file, content) {
	const tmp = `${file}.tmp-${process.pid}-${Date.now()}`;
	try {
		writeFileSync(tmp, content, 'utf8');
		renameSync(tmp, file);
	} catch (err) {
		try {
			unlinkSync(tmp);
		} catch {
			/* best-effort cleanup，失败也不掩盖原始错误 */
		}
		throw err;
	}
}

/** --write 前要求工作区干净，这样出问题可以直接 git checkout/diff 回滚 */
function ensureCleanGitTree() {
	if (FORCE) return;
	try {
		const status = execSync('git status --porcelain', {
			cwd: ROOT,
			stdio: ['ignore', 'pipe', 'ignore'],
		})
			.toString()
			.trim();
		if (status) {
			console.error('✗ 工作区存在未提交的改动，为避免与脚本改动混淆，已拒绝执行 --write。');
			console.error('  请先 git commit / git stash，确认无误后也可加 --force 跳过本检查。');
			process.exit(2);
		}
	} catch (err) {
		console.warn(`WARN: 无法执行 git status（可能不是 git 仓库），跳过脏树检查：${err.message}`);
	}
}

function main() {
	if (HELP) {
		printHelp();
		return;
	}
	if (WRITE && CHECK) {
		console.error('✗ --write 与 --check 请勿在同一次调用中混用：先 --write 落盘，再单独跑 --check 校验磁盘上的真实结果。');
		process.exit(2);
	}
	try {
		statSync(CONTENT_DIR);
	} catch {
		console.error(`✗ 找不到内容目录：${CONTENT_DIR}`);
		process.exit(2);
	}
	if (WRITE) ensureCleanGitTree();

	const notes = collectNotes();
	const index = buildImageIndex();

	let totalHits = 0; // 处理前，本次扫描到的 ![[...]] 总数
	let remainingAfter = 0; // 处理后仍残留的 ![[...]]（即未被成功转换的那些）
	let changedFiles = 0;
	const missing = [];
	const warnings = [];
	const changes = [];

	for (const note of notes) {
		const text = readFileSync(note, 'utf8');
		const noteDir = path.dirname(note);
		const disp = path.relative(ROOT, note);
		let fileHits = 0;

		const next = text.replace(WIKILINK_RE, (full, inner) => {
			totalHits += 1;
			fileHits += 1;
			const { target, alt, droppedSize } = parseInner(inner);
			const { abs, reason, warning } = resolveTarget(noteDir, target, index);

			if (!abs) {
				missing.push(`${disp}: ${full} —— ${reason}，已跳过`);
				return full; // 找不到 / 非图片，不硬写路径，原样保留
			}
			if (warning) warnings.push(`${disp}: ${warning}`);
			if (droppedSize) {
				warnings.push(`${disp}: ${full} 的 |尺寸 后缀在标准 Markdown 无对应，已丢弃（只保留图片本身）`);
			}

			const rel = path.relative(noteDir, abs).split(path.sep).join('/');
			const relFixed = rel.startsWith('.') ? rel : `./${rel}`;
			const altText = (alt ?? path.basename(abs, path.extname(abs))).replace(/[\[\]]/g, '');
			// 用 <...> 包裹路径：既符合 CommonMark 对含空格路径的写法，也规避文件名里圆括号破坏 ![]() 语法
			return `![${altText}](<${encodeRel(relFixed)}>)`;
		});

		remainingAfter += (next.match(WIKILINK_RE) || []).length;

		if (fileHits === 0) continue;
		if (next === text) continue;

		changedFiles += 1;
		const diffLines = [];
		if (!JSON_OUT) {
			const oldLines = text.split('\n');
			const newLines = next.split('\n');
			oldLines.forEach((line, i) => {
				if (line !== newLines[i]) {
					diffLines.push({
						old: line.trim().slice(0, 120),
						new: (newLines[i] ?? '').trim().slice(0, 160),
					});
				}
			});
		}

		if (WRITE) {
			atomicWrite(note, next);
			if (!JSON_OUT) console.log(`[write] ${disp}: 改写 ${fileHits} 处`);
		} else if (!JSON_OUT) {
			console.log(`[dry-run] ${disp}: 将改写 ${fileHits} 处`);
			for (const d of diffLines) {
				console.log(`  - ${d.old}`);
				console.log(`  + ${d.new}`);
			}
		}
		changes.push({ file: disp, hits: fileHits, written: WRITE, diff: diffLines });
	}

	// --check 的语义：反映“当前磁盘真实状态”——
	// 没加 --write 时磁盘未变，用扫描到的原始 totalHits；
	// 加了 --write 时磁盘已更新，用处理后仍残留的 remainingAfter。
	const remaining = WRITE ? remainingAfter : totalHits;

	const report = {
		notesScanned: notes.length,
		totalHits,
		changedFiles,
		remaining,
		written: WRITE,
		changes,
		warnings,
		missing,
	};

	if (JSON_OUT) {
		console.log(JSON.stringify(report, null, 2));
	} else {
		console.log(
			`\n扫描 ${notes.length} 个笔记，共 ${totalHits} 处 ![[...]]，${WRITE ? '已改写' : '待改写'} ${changedFiles} 个文件。`,
		);
		for (const w of warnings) console.log(`WARN: ${w}`);
		if (missing.length > 0) {
			console.log(`MISSING (${missing.length})：`);
			for (const m of missing) console.log(`  ${m}`);
		}
	}

	if (STRICT && missing.length > 0) {
		if (!JSON_OUT) {
			console.error(`✗ --strict 模式：存在 ${missing.length} 处无法解析的图片引用，视为失败。`);
		}
		process.exit(1);
	}

	if (CHECK && remaining > 0) {
		if (!JSON_OUT) {
			console.error(`✗ check 失败：仍有 ${remaining} 处 wikilink 图片残留，先跑 --write 修复。`);
		}
		process.exit(1);
	}
}

try {
	main();
} catch (err) {
	console.error('✗ 脚本执行失败：', err?.stack ?? err);
	process.exit(2);
}
