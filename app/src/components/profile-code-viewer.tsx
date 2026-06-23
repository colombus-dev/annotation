import { Editor } from "@monaco-editor/react";
import { Check, Edit2, FileCode2, Plus, Save, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vs } from "react-syntax-highlighter/dist/esm/styles/prism";
import { toast } from "sonner";
import type { GraphDefinition, StepNode } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { getStepIcon, stepsColorsMapping } from "@/configuration";
import type { Pattern, PpmResult } from "@/lib/types";
import { hexToRgba } from "@/lib/utils";
import { useColombusStore } from "@/store";

interface ProfileCodeViewerProps {
	nodes?: GraphDefinition[];
	overrideSelectedNodeId?: string | null;
	overridePattern?: Pattern | null;
	overridePpmData?: PpmResult[];
}

interface LineRange {
	startLine: number;
	endLine: number;
}

export default function ProfileCodeViewer({
	nodes,
	overrideSelectedNodeId,
	overridePattern,
	overridePpmData,
}: ProfileCodeViewerProps) {
	// ---------------------------------------------------------
	// GLOBAL STATE
	// ---------------------------------------------------------
	const [isAnnotationMode, setIsAnnotationMode] = useState(false);

	const storeSelectedNodeId = useColombusStore((state) => state.selectedProfileNodeId);
	const setSelectedProfileNodeId = useColombusStore((state) => state.setSelectedProfileNodeId);
	const setSelectedProfileName = useColombusStore((state) => state.setSelectedProfileName);

	const selectedNodeId = overrideSelectedNodeId !== undefined ? overrideSelectedNodeId : storeSelectedNodeId;

	const handleNodeSelect = useCallback((id: string | null) => {
		setSelectedProfileNodeId(id);
		if (id && nodes) {
			const node = nodes.find((n) => n.id === id);
			setSelectedProfileName(node ? node.name : null);
		} else {
			setSelectedProfileName(null);
		}
	}, [nodes, setSelectedProfileNodeId, setSelectedProfileName]);

	useEffect(() => {
		if (overrideSelectedNodeId !== undefined) return;

		if (!nodes || nodes.length === 0) {
			if (selectedNodeId !== null) {
				handleNodeSelect(null);
			}
			return;
		}
		if (selectedNodeId && !nodes.find((n) => n.id === selectedNodeId)) {
			handleNodeSelect(null);
		}
	}, [nodes, selectedNodeId, handleNodeSelect, overrideSelectedNodeId]);

	const activeNode = useMemo(() => {
		if (!nodes || !selectedNodeId) return null;
		return nodes.find((n) => n.id === selectedNodeId) || null;
	}, [nodes, selectedNodeId]);

	const storePattern = useColombusStore((state) => state.currentPattern);
	const currentPattern = overridePattern !== undefined ? overridePattern : storePattern;
	const storeAvailableProfilesWithPpmData = useColombusStore((state) => state.availableProfilesWithPpmData);
	const availableProfilesWithPpmData = overridePpmData !== undefined ? overridePpmData : storeAvailableProfilesWithPpmData;

	const [selectedStepIds, setSelectedStepIds] = useState<Set<string>>(new Set());
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const [editingStepId, setEditingStepId] = useState<string | null>(null);
	const [editedCode, setEditedCode] = useState<string>("");
	const [localCodeEdits, setLocalCodeEdits] = useState<Record<string, string>>({});

	const displayedSteps = useMemo(() => activeNode?.steps || [], [activeNode]);
	const matchedStepIds = useMemo(() => {
		if (!activeNode || !currentPattern) return new Set<string>();
		const profileMatches = (availableProfilesWithPpmData || []).filter((p) => p.profile_name === activeNode.name);
		return new Set(profileMatches.flatMap((p) => p.results.flat()));
	}, [activeNode, currentPattern, availableProfilesWithPpmData]);

	const getStepCode = useCallback((node: GraphDefinition, step: StepNode) => {
		if (localCodeEdits[step.id] !== undefined) return localCodeEdits[step.id];
		const stepMeta = node.meta_instructions?.filter((m) => m.step_id === step.id) || [];
		const stepCodes = stepMeta.flatMap((m) => node.codes?.filter((c) => c.meta_instruction_id === m.id) || []);
		return stepCodes.map((c) => c.content).join("\n\n");
	}, [localCodeEdits]);

	const { fullCode, stepLineRanges } = useMemo(() => {
		if (!activeNode || displayedSteps.length === 0) {
			return { fullCode: "", stepLineRanges: [] };
		}
		const codes: string[] = [];
		const ranges: Array<{ stepId: string; startLine: number; endLine: number }> = [];
		let currentLine = 1;
		for (const step of displayedSteps) {
			const stepCode = getStepCode(activeNode, step);
			if (stepCode) {
				const lineCount = stepCode.split("\n").length;
				ranges.push({ stepId: step.id, startLine: currentLine, endLine: currentLine + lineCount - 1 });
				codes.push(stepCode);
				currentLine += lineCount + 1;
			}
		}
		return { fullCode: codes.join("\n\n"), stepLineRanges: ranges };
	}, [activeNode, displayedSteps, getStepCode]);

	const scrollToLine = useCallback((startLine: number) => {
		if (!scrollContainerRef.current) return;
		const lineEl = scrollContainerRef.current.querySelector(`#code-line-${startLine}`);
		if (lineEl) {
			lineEl.scrollIntoView({ behavior: "auto", block: "center" });
		}
	}, []);

	const handleStepClick = useCallback((stepId: string) => {
		setSelectedStepIds((prev) => {
			const next = new Set(prev);
			if (next.has(stepId)) next.delete(stepId);
			else next.add(stepId);
			return next;
		});
		const stepRange = stepLineRanges.find((r) => r.stepId === stepId);
		if (stepRange) scrollToLine(stepRange.startLine);
	}, [stepLineRanges, scrollToLine]);

	useEffect(() => {
		if (currentPattern && matchedStepIds.size > 0 && !isAnnotationMode) {
			const firstRange = stepLineRanges.find((r) => matchedStepIds.has(r.stepId));
			if (firstRange) scrollToLine(firstRange.startLine);
		}
	}, [currentPattern, matchedStepIds, stepLineRanges, scrollToLine, isAnnotationMode]);

	const isSingleStepSelected = selectedStepIds.size === 1;
	const singleSelectedStepId = isSingleStepSelected ? Array.from(selectedStepIds)[0] : null;

	const handleEditStart = () => {
		if (singleSelectedStepId && activeNode) {
			const step = displayedSteps.find((s) => s.id === singleSelectedStepId);
			if (step) {
				setEditedCode(getStepCode(activeNode, step));
				setEditingStepId(singleSelectedStepId);
			}
		}
	};

	const handleSave = () => {
		if (!editingStepId) return;
		setLocalCodeEdits((prev) => ({ ...prev, [editingStepId]: editedCode }));
		toast.success("Code updated locally (Storybook mode).");
		setEditingStepId(null);
	};

	// ---------------------------------------------------------
	// ANNOTATOR MODE STATE (Edit)
	// ---------------------------------------------------------
	const [localCode, setLocalCode] = useState("");
	const [localSteps, setLocalSteps] = useState<StepNode[]>([]);
	const [localAnnotations, setLocalAnnotations] = useState<Record<string, LineRange>>({});
	const [newLabelName, setNewLabelName] = useState("");
	const [currentSelection, setCurrentSelection] = useState<LineRange | null>(null);
	const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
	const [editingLabelName, setEditingLabelName] = useState("");

	const editorRef = useRef<any>(null);
	const oldDecorationsRef = useRef<string[]>([]);

	useEffect(() => {
		if (activeNode) {
			const codes: string[] = [];
			const annotations: Record<string, LineRange> = {};
			let currentLine = 1;
			for (const step of displayedSteps) {
				const stepCode = getStepCode(activeNode, step);
				if (stepCode) {
					const lineCount = stepCode.split("\n").length;
					annotations[step.id] = { startLine: currentLine, endLine: currentLine + lineCount - 1 };
					codes.push(stepCode);
					currentLine += lineCount + 1;
				}
			}
			setLocalCode(codes.join("\n\n"));
			setLocalSteps(displayedSteps);
			setLocalAnnotations(annotations);
		} else {
			setLocalCode("");
			setLocalSteps([]);
			setLocalAnnotations({});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeNode]);

	const handleEditorMount = (editor: any) => {
		editorRef.current = editor;
		editor.onDidChangeCursorSelection((e: any) => {
			const sel = e.selection;
			if (sel.startLineNumber !== sel.endLineNumber || sel.startColumn !== sel.endColumn) {
				setCurrentSelection({ startLine: sel.startLineNumber, endLine: sel.endLineNumber });
			} else {
				setCurrentSelection(null);
			}
		});
	};

	useEffect(() => {
		if (!editorRef.current) return;
		const monaco = (window as any).monaco;
		if (!monaco) return;

		const newDecorations: any[] = [];
		Object.entries(localAnnotations).forEach(([stepId, range]) => {
			if (!range) return;
			const step = localSteps.find((s) => s.id === stepId);
			if (!step) return;

			newDecorations.push({
				range: new monaco.Range(range.startLine, 1, range.endLine, 1),
				options: {
					isWholeLine: true,
					className: `annotation-bg-${stepId}`,
					marginClassName: `annotation-gutter-${stepId}`,
					hoverMessage: { value: `**${step.name}**` },
				},
			});
		});

		oldDecorationsRef.current = editorRef.current.deltaDecorations(
			oldDecorationsRef.current,
			newDecorations,
		);
	}, [localAnnotations, localSteps]);

	const handleAddLabel = () => {
		if (!newLabelName.trim()) return;
		const newStepId = `local_step_${Date.now()}`;
		const newStep: StepNode = { id: newStepId, name: newLabelName.trim(), position: localSteps.length, number_children: 0 };
		setLocalSteps([...localSteps, newStep]);
		setNewLabelName("");
		toast.success("Step created!");
	};

	const handleAssign = (stepId: string) => {
		if (!currentSelection) return;
		setLocalAnnotations((prev) => ({ ...prev, [stepId]: currentSelection }));
		editorRef.current?.setSelection(new (window as any).monaco.Selection(1, 1, 1, 1));
		setCurrentSelection(null);
		toast.success("Lines assigned to step.");
	};

	const handleRemoveAssignment = (stepId: string) => {
		setLocalAnnotations((prev) => {
			const next = { ...prev };
			delete next[stepId];
			return next;
		});
	};

	const handleDeleteLabel = (stepId: string) => {
		setLocalSteps((prev) => prev.filter((s) => s.id !== stepId));
		handleRemoveAssignment(stepId);
	};

	const handleStartRename = (step: StepNode) => {
		setEditingLabelId(step.id);
		setEditingLabelName(step.name);
	};

	const handleSaveRename = () => {
		if (!editingLabelName.trim()) return;
		setLocalSteps((prev) => prev.map((s) => (s.id === editingLabelId ? { ...s, name: editingLabelName.trim() } : s)));
		setEditingLabelId(null);
	};

	const handleLabelClick = (stepId: string) => {
		const range = localAnnotations[stepId];
		if (range && editorRef.current) {
			editorRef.current.revealLineInCenter(range.startLine);
			editorRef.current.setSelection(
				new (window as any).monaco.Selection(range.startLine, 1, range.endLine, 999),
			);
		}
	};

	if (!nodes || nodes.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center h-full min-h-[350px] p-8 text-slate-500 bg-white rounded-2xl shadow-lg border border-slate-200">
				<FileCode2 className="w-12 h-12 mb-4 text-slate-300" />
				<p>No notebooks or profiles selected.</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col w-full h-full min-h-[500px] bg-white rounded-2xl shadow-lg border border-slate-200 font-sans text-slate-700">
			{isAnnotationMode && (
				<style>
					{localSteps.map((step) => {
						const color = stepsColorsMapping[step.name] || "#22d3ee";
						const rgba = hexToRgba(color, 0.2);
						return `
						.annotation-bg-${step.id} { background-color: ${rgba}; }
						.annotation-gutter-${step.id} { border-left: 4px solid ${color}; margin-left: 5px; }
					`;
					}).join("\n")}
				</style>
			)}

			{/* Header */}
			<div className="flex justify-between items-center px-4 py-3 bg-slate-50 border-b border-slate-200 rounded-t-2xl z-10 shrink-0">
				<div className="flex items-center">
					<Select value={selectedNodeId || undefined} onValueChange={handleNodeSelect}>
						<SelectTrigger className="w-64 bg-white border-slate-200 text-slate-900 shadow-sm font-medium">
							<SelectValue placeholder={isAnnotationMode ? "Empty Notebook (Type below)" : "Select a profile"} />
						</SelectTrigger>
						<SelectContent className="bg-white border-slate-200 text-slate-900">
							{isAnnotationMode && (
								<SelectItem value="empty_notebook_placeholder">-- Empty Notebook --</SelectItem>
							)}
							{nodes?.map((node) => (
								<SelectItem key={node.id} value={node.id}>{node.name}</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="flex items-center space-x-3">
					<Label
						htmlFor="mode-switch"
						className={`text-sm cursor-pointer transition-colors ${!isAnnotationMode ? "font-bold text-slate-900" : "font-medium text-slate-500 hover:text-slate-700"}`}
					>
						View Code
					</Label>
					<Switch id="mode-switch" checked={isAnnotationMode} onCheckedChange={setIsAnnotationMode} />
					<Label
						htmlFor="mode-switch"
						className={`text-sm cursor-pointer transition-colors ${isAnnotationMode ? "font-bold text-slate-900" : "font-medium text-slate-500 hover:text-slate-700"}`}
					>
						Edit
					</Label>
				</div>
			</div>

			<div className="flex-1 min-h-0 relative flex rounded-b-2xl overflow-hidden">
				<div className="w-80 bg-slate-50/50 border-r border-slate-200 flex flex-col z-10 shrink-0 min-h-0">
					{isAnnotationMode ? (
						<>
							<div className="flex-1 overflow-y-auto p-3 space-y-3">
								<div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">STEPS</div>
								{localSteps.length === 0 ? (
									<div className="p-4 text-sm text-slate-500 italic text-center border border-dashed border-slate-300 rounded-lg">
										No steps created yet.
									</div>
								) : (
									localSteps.map((step) => {
										const color = stepsColorsMapping[step.name] || "#22d3ee";
										return (
											<div key={step.id} className="flex flex-col bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
												<div
													className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors"
													onClick={() => handleLabelClick(step.id)}
													onKeyDown={(e) => { if (e.key === "Enter") handleLabelClick(step.id); }}
												>
													<div className="flex items-center space-x-2 flex-1 min-w-0 mr-2">
														<div className="p-1 rounded-md shrink-0" style={{ backgroundColor: hexToRgba(color, 0.15), color }}>
															{getStepIcon(step.name)}
														</div>
														{editingLabelId === step.id ? (
															<div className="flex items-center w-full space-x-1">
																<Input
																	value={editingLabelName}
																	onChange={(e) => setEditingLabelName(e.target.value)}
																	onKeyDown={(e) => {
																		if (e.key === "Enter") handleSaveRename();
																		if (e.key === "Escape") setEditingLabelId(null);
																	}}
																	onClick={(e) => e.stopPropagation()}
																	autoFocus
																	className="h-7 text-xs px-2"
																/>
																<button type="button" onClick={(e) => { e.stopPropagation(); handleSaveRename(); }} className="p-1 text-green-600 hover:bg-green-100 rounded shrink-0">
																	<Check className="w-3 h-3" />
																</button>
																<button type="button" onClick={(e) => { e.stopPropagation(); setEditingLabelId(null); }} className="p-1 text-slate-400 hover:bg-slate-200 rounded shrink-0">
																	<X className="w-3 h-3" />
																</button>
															</div>
														) : (
															<span className="text-sm font-medium text-slate-800 truncate" title={step.name}>{step.name}</span>
														)}
													</div>

													<div className="flex items-center space-x-1 shrink-0">
														{editingLabelId !== step.id && (
															<>
																<button type="button" onClick={(e) => { e.stopPropagation(); handleStartRename(step); }} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded" title="Rename step">
																	<Edit2 className="w-3 h-3" />
																</button>
																<button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteLabel(step.id); }} className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded" title="Delete step">
																	<Trash2 className="w-3 h-3" />
																</button>
															</>
														)}
														{currentSelection && (
															<Button size="sm" variant="default" className="h-7 px-2 ml-1 text-xs" onClick={(e) => { e.stopPropagation(); handleAssign(step.id); }}>
																<Plus className="w-3 h-3 mr-1" /> Assign
															</Button>
														)}
													</div>
												</div>
												<div className="px-3 py-2 text-xs text-slate-500 space-y-2 bg-white">
													{!localAnnotations[step.id] ? (
														<span className="italic">No lines assigned.</span>
													) : (
														<div className="flex items-center justify-between bg-slate-50/50 rounded px-2 py-1.5 border border-slate-200">
															<span className="font-medium text-[11px] uppercase tracking-wider text-slate-500">
																Lines: {localAnnotations[step.id].startLine} - {localAnnotations[step.id].endLine}
															</span>
															<button type="button" onClick={(e) => { e.stopPropagation(); handleRemoveAssignment(step.id); }} className="text-red-400 hover:text-red-600 p-0.5" title="Remove lines">
																<X className="w-3 h-3" />
															</button>
														</div>
													)}
												</div>
											</div>
										);
									})
								)}
							</div>
							<div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2 shrink-0">
								<div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">CREATE NEW STEP</div>
								<Input placeholder="e.g. Data Cleaning" value={newLabelName} onChange={(e) => setNewLabelName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleAddLabel(); }} className="bg-white" />
								<Button className="w-full" onClick={handleAddLabel} disabled={!newLabelName.trim()}>
									<Plus className="w-4 h-4 mr-2" /> Add Step
								</Button>
							</div>
						</>
					) : (
						<>
							<div className="flex-1 overflow-y-auto p-3 space-y-2">
								{displayedSteps.length === 0 ? (
									<div className="p-4 text-sm text-slate-500 italic text-center">No steps available.</div>
								) : (
									<div className="flex items-center justify-between px-2 pb-2 mb-2 border-b border-slate-200/60">
										<span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Steps</span>
										<button
											type="button"
											onClick={() => {
												if (selectedStepIds.size === displayedSteps.length) setSelectedStepIds(new Set());
												else setSelectedStepIds(new Set(displayedSteps.map((s) => s.id)));
											}}
											className="flex items-center space-x-2 text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors cursor-pointer"
										>
											<Checkbox checked={selectedStepIds.size === displayedSteps.length && displayedSteps.length > 0} className="border-slate-300 pointer-events-none" />
											<span>{selectedStepIds.size === displayedSteps.length ? "Hide all" : "Show all"}</span>
										</button>
									</div>
								)}
								{displayedSteps.map((step) => {
									const currentStepColor = stepsColorsMapping[step.name] || "#22d3ee";
									const isMatched = currentPattern ? matchedStepIds.has(step.id) : true;
									const isSelected = selectedStepIds.has(step.id);
									return (
										<button
											key={step.id}
											type="button"
											className={`
												relative w-full group cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-slate-400
												rounded-lg overflow-hidden transition-all duration-200 border border-transparent
												${isSelected ? "shadow-[0_2px_10px_rgba(0,0,0,0.06)] bg-white" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"}
												${!isMatched ? "opacity-40" : "opacity-100"}
											`}
											onClick={() => handleStepClick(step.id)}
											style={{ borderColor: isSelected ? hexToRgba(currentStepColor, 0.2) : "transparent" }}
										>
											<div
												className="w-full flex items-center px-4 py-3 border-l-4"
												style={{
													backgroundColor: isSelected ? hexToRgba(currentStepColor, 0.08) : "transparent",
													borderLeftColor: isSelected ? currentStepColor : isMatched && currentPattern ? hexToRgba(currentStepColor, 0.5) : "transparent",
												}}
											>
												<div className="flex items-center space-x-3 relative z-10 w-full">
													<div
														className="p-1.5 rounded-md flex-shrink-0"
														style={{
															backgroundColor: isSelected ? currentStepColor : hexToRgba(currentStepColor, 0.15),
															color: isSelected ? "white" : currentStepColor,
														}}
													>
														{getStepIcon(step.name)}
													</div>
													<div className="flex flex-col flex-1 min-w-0">
														<span className={`text-sm font-medium truncate ${isSelected ? "text-slate-900 font-bold" : "text-slate-700"}`}>
															{step.name}
														</span>
													</div>
												</div>
											</div>
										</button>
									);
								})}
							</div>
						</>
					)}
				</div>
				<div className="flex-1 flex flex-col min-w-0 min-h-0 bg-white">
					<div className="flex-1 p-6 flex flex-col min-h-0">
						<div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
							<div className="flex justify-between items-end px-4 py-2 bg-slate-50 border-b border-slate-200 shrink-0">
								<div className="flex space-x-6 text-sm">
									<button type="button" className="pb-2 px-1 font-medium border-b-2 border-slate-900 text-slate-900">Python</button>
								</div>
								{!isAnnotationMode && (
									<div className="flex space-x-2">
										{editingStepId ? (
											<>
												<Button size="sm" variant="outline" onClick={() => setEditingStepId(null)}>
													<X className="w-4 h-4 mr-2" /> Cancel
												</Button>
												<Button size="sm" onClick={handleSave}>
													<Save className="w-4 h-4 mr-2" /> Save
												</Button>
											</>
										) : isSingleStepSelected ? (
											<Button size="sm" variant="outline" onClick={handleEditStart}>
												<Edit2 className="w-4 h-4 mr-2" /> Edit Code
											</Button>
										) : null}
									</div>
								)}
							</div>

							{(isAnnotationMode || editingStepId) ? (
								<div className="flex-1 w-full bg-white relative border-t border-slate-100">
									<Editor
										height="100%"
										defaultLanguage="python"
										theme="light"
										value={isAnnotationMode ? localCode : editedCode}
										onChange={(val) => isAnnotationMode ? setLocalCode(val || "") : setEditedCode(val || "")}
										onMount={isAnnotationMode ? handleEditorMount : undefined}
										options={{
											minimap: { enabled: false },
											fontSize: 14,
											wordWrap: "on",
											scrollBeyondLastLine: false,
											renderLineHighlight: "all",
										}}
									/>
								</div>
							) : (
								<div ref={scrollContainerRef} className="flex-1 w-full bg-white border-t border-slate-100 relative overflow-auto">
									{fullCode ? (
										<SyntaxHighlighter
											language="python"
											style={vs}
											showLineNumbers
											lineNumberStyle={{ color: "#94a3b8", minWidth: "3em", paddingRight: "1.5em", textAlign: "right", display: "inline-block", userSelect: "none" }}
											wrapLines={true}
											customStyle={{ margin: 0, padding: "1rem", backgroundColor: "transparent", fontSize: "14px", lineHeight: "1.6" }}
											lineProps={(lineNumber) => {
												const baseStyle: React.CSSProperties = { display: "flex", flexDirection: "row", borderLeft: "3px solid transparent", backgroundColor: "transparent" };
												const matchingStepRange = stepLineRanges.find((r) => lineNumber >= r.startLine && lineNumber <= r.endLine);

												if (!matchingStepRange) return { id: `code-line-${lineNumber}`, style: baseStyle };

												const step = displayedSteps.find((s) => s.id === matchingStepRange.stepId);
												const stepColor = step ? stepsColorsMapping[step.name] || "#22d3ee" : "#22d3ee";
												const isSelected = selectedStepIds.has(matchingStepRange.stepId);
												const isMatched = currentPattern && matchedStepIds.has(matchingStepRange.stepId);

												if (isSelected) {
													baseStyle.backgroundColor = hexToRgba(stepColor, 0.25);
													baseStyle.borderLeft = `3px solid ${stepColor}`;
												} else if (isMatched) {
													baseStyle.backgroundColor = hexToRgba(stepColor, 0.12);
													baseStyle.borderLeft = `3px solid ${hexToRgba(stepColor, 0.6)}`;
												}

												return { id: `code-line-${lineNumber}`, style: baseStyle };
											}}
										>
											{fullCode}
										</SyntaxHighlighter>
									) : (
										<div className="flex items-center justify-center h-full text-slate-500 italic">
											No code available for this profile.
										</div>
									)}
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
