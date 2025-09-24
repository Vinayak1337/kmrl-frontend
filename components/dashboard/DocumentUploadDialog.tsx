'use client';

import React, { useState, useRef } from 'react';
import { Upload, File, FileText, AlertCircle, Check } from 'lucide-react';
import { RichTextEditor } from './RichTextEditor';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/UI/dialog';
import { Button } from '@/components/UI/button';
import { Input } from '@/components/UI/input';
import {
	Select,
	SelectTrigger,
	SelectContent,
	SelectItem
} from '@/components/UI/select';
import { Label } from '@/components/UI/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/UI/alert';
import { Badge } from '@/components/UI/badge';

interface DocumentUploadDialogProps {
	isOpen: boolean;
	onClose: () => void;
	onUpload: (documents: DocumentToUpload[]) => Promise<unknown>;
}

interface DocumentToUpload {
	type: 'html' | 'text' | 'pdf' | 'doc' | 'image';
	content: string;
	filename: string;
	department?: string;
	documentType?: string;
	tags?: string[];
}

interface UploadStatus {
	status: 'pending' | 'uploading' | 'success' | 'error' | 'warning';
	message?: string;
}

export const DocumentUploadDialog: React.FC<DocumentUploadDialogProps> = ({
	isOpen,
	onClose,
	onUpload
}) => {
	const [uploadMode, setUploadMode] = useState<'file' | 'editor' | null>(null);
	const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
	const [editorContent, setEditorContent] = useState<string>('');
	const [documentTitle, setDocumentTitle] = useState<string>('');
	const [department, setDepartment] = useState<string>('');
	const [documentType, setDocumentType] = useState<string>('');
	const [tags, setTags] = useState<string>('');
	const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null);
	const [analysisInfo, setAnalysisInfo] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const reset = () => {
		setUploadMode(null);
		setSelectedFiles([]);
		setEditorContent('');
		setDocumentTitle('');
		setDepartment('');
		setDocumentType('');
		setTags('');
		setUploadStatus(null);
	};

	const handleClose = () => {
		reset();
		onClose();
	};

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const fileList = e.target.files;
		if (!fileList) return;

		const files = Array.from(fileList);
		const validTypes = new Set([
			'application/pdf',
			'application/msword',
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			'text/plain',
			'text/html',
			'image/png',
			'image/jpeg'
		]);

		const validFiles = files.filter(
			file =>
				validTypes.has(file.type) ||
				/\.(pdf|doc|docx|txt|html|png|jpg|jpeg)$/i.test(file.name)
		);

		if (validFiles.length !== files.length) {
			setUploadStatus({
				status: 'warning',
				message: 'Some files were not supported and were skipped.'
			});
		}

		setSelectedFiles(validFiles);
	};

	const getFileType = (file: File): DocumentToUpload['type'] => {
		if (file.type.includes('pdf')) return 'pdf';
		if (
			file.type.includes('word') ||
			file.name.endsWith('.doc') ||
			file.name.endsWith('.docx')
		)
			return 'doc';
		if (file.type.includes('image')) return 'image';
		if (file.type.includes('html')) return 'html';
		return 'text';
	};

	const handleSubmit = async () => {
		setUploadStatus({
			status: 'uploading',
			message: 'Processing documents...'
		});

		try {
			const documents: DocumentToUpload[] = [];
			const tagArray = tags
				.split(',')
				.map(t => t.trim())
				.filter(Boolean);

			if (uploadMode === 'editor' && editorContent) {
				documents.push({
					type: 'html',
					content: editorContent,
					filename: documentTitle || 'Untitled Document',
					department,
					documentType,
					tags: tagArray
				});
			} else if (uploadMode === 'file' && selectedFiles.length > 0) {
				for (const file of selectedFiles) {
					const content = await fileToBase64(file);
					documents.push({
						type: getFileType(file),
						content,
						filename: file.name,
						department,
						documentType,
						tags: tagArray
					});
				}
			}

			const res = (await onUpload(documents)) as {
				nodeCount?: number;
				summaries?: unknown[];
			};
			if (res?.nodeCount != null) {
				setAnalysisInfo(`Processed into ${res.nodeCount} nodes.`);
			} else if (Array.isArray(res?.summaries)) {
				setAnalysisInfo(`Processed ${res.summaries.length} documents.`);
			}
			setUploadStatus({
				status: 'success',
				message: 'Ingestion completed successfully.'
			});

			setTimeout(() => {
				handleClose();
			}, 1400);
		} catch (error) {
			setUploadStatus({
				status: 'error',
				message: error instanceof Error ? error.message : 'Upload failed'
			});
		}
	};

	const fileToBase64 = (file: File): Promise<string> => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => {
				const result = reader.result as string;
				if (file.type.includes('text') || file.name.endsWith('.txt')) {
					resolve(result);
				} else {
					const base64 = result.split(',')[1];
					resolve(base64);
				}
			};
			reader.onerror = reject;

			if (file.type.includes('text') || file.name.endsWith('.txt')) {
				reader.readAsText(file);
			} else {
				reader.readAsDataURL(file);
			}
		});
	};

	const tagArray = tags
		.split(',')
		.map(t => t.trim())
		.filter(Boolean);

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open: boolean) => {
				if (!open) handleClose();
			}}>
			<DialogContent
				className='max-w-4xl w-full force-light'
				onClose={handleClose}>
				<DialogHeader>
					<DialogTitle>Upload Documents</DialogTitle>
					<DialogDescription>
						Upload files or create a document. Add metadata and tags for better
						organization.
					</DialogDescription>
				</DialogHeader>

				{!uploadMode ? (
					<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
						<Button
							variant='outline'
							className='p-8 h-auto flex flex-col items-center gap-3 border-dashed'
							onClick={() => setUploadMode('file')}>
							<File className='h-10 w-10 text-gray-600' />
							<div className='text-center'>
								<div className='font-medium'>Upload Files</div>
								<div className='text-xs text-gray-500'>
									PDF, DOC/DOCX, TXT, HTML, PNG, JPG
								</div>
							</div>
						</Button>

						<Button
							variant='outline'
							className='p-8 h-auto flex flex-col items-center gap-3 border-dashed'
							onClick={() => setUploadMode('editor')}>
							<FileText className='h-10 w-10 text-gray-600' />
							<div className='text-center'>
								<div className='font-medium'>Create Document</div>
								<div className='text-xs text-gray-500'>
									Use the rich text editor
								</div>
							</div>
						</Button>
					</div>
				) : (
					<div className='space-y-6'>
						{uploadMode === 'file' ? (
							<div>
								<input
									ref={fileInputRef}
									type='file'
									multiple
									accept='.pdf,.doc,.docx,.txt,.html,.png,.jpg,.jpeg'
									onChange={handleFileSelect}
									className='hidden'
								/>
								<Button
									variant='outline'
									className='w-full p-8 h-auto border-dashed'
									onClick={() => fileInputRef.current?.click()}>
									<div className='flex flex-col items-center'>
										<Upload className='h-10 w-10 text-gray-600 mb-3' />
										<div className='text-gray-700'>Click to select files</div>
										<div className='text-xs text-gray-500 mt-1'>
											You can select multiple files
										</div>
									</div>
								</Button>

								{selectedFiles.length > 0 && (
									<div className='mt-4 space-y-2'>
										{selectedFiles.map((file, index) => (
											<div
												key={index}
												className='flex items-center p-3 bg-gray-50 rounded-lg'>
												<FileText className='h-5 w-5 text-gray-500 mr-3' />
												<span className='text-sm text-gray-900 flex-1'>
													{file.name}
												</span>
												<span className='text-xs text-gray-500'>
													{(file.size / 1024).toFixed(1)} KB
												</span>
											</div>
										))}
									</div>
								)}
							</div>
						) : (
							<div className='space-y-4'>
								<Label htmlFor='docTitle'>Document Title</Label>
								<Input
									id='docTitle'
									placeholder='Document Title'
									value={documentTitle}
									onChange={e => setDocumentTitle(e.target.value)}
								/>
								<RichTextEditor
									value={editorContent}
									onChange={setEditorContent}
									placeholder='Start typing your document content...'
								/>
							</div>
						)}

						{/* Metadata Fields */}
						<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
							<div className='space-y-2'>
								<Label htmlFor='department'>Department</Label>
								<Select
									value={department}
									onValueChange={setDepartment}
									placeholder='Select Department'>
									<SelectTrigger />
									<SelectContent>
										<SelectItem value='Engineering'>Engineering</SelectItem>
										<SelectItem value='Operations'>Operations</SelectItem>
										<SelectItem value='Safety'>Safety</SelectItem>
										<SelectItem value='HR'>HR</SelectItem>
										<SelectItem value='Finance'>Finance</SelectItem>
										<SelectItem value='Procurement'>Procurement</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className='space-y-2'>
								<Label htmlFor='docType'>Document Type</Label>
								<Select
									value={documentType}
									onValueChange={setDocumentType}
									placeholder='Select Type'>
									<SelectTrigger />
									<SelectContent>
										<SelectItem value='safety_circular'>
											Safety Circular
										</SelectItem>
										<SelectItem value='technical_specification'>
											Technical Specification
										</SelectItem>
										<SelectItem value='procurement'>Procurement</SelectItem>
										<SelectItem value='hr_policy'>HR Policy</SelectItem>
										<SelectItem value='maintenance'>Maintenance</SelectItem>
										<SelectItem value='regulatory'>Regulatory</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className='space-y-2'>
							<Label htmlFor='tags'>Tags (comma-separated)</Label>
							<Input
								id='tags'
								placeholder='e.g., urgent, compliance, Q1-2025'
								value={tags}
								onChange={e => setTags(e.target.value)}
							/>
							{tagArray.length > 0 && (
								<div className='flex flex-wrap gap-2'>
									{tagArray.map((t, i) => (
										<Badge key={`${t}-${i}`} className='capitalize'>
											{t}
										</Badge>
									))}
								</div>
							)}
						</div>
					</div>
				)}

				{uploadStatus && (
					<Alert
						className='mt-4'
						variant={
							uploadStatus.status === 'error'
								? 'destructive'
								: uploadStatus.status === 'success'
								? 'success'
								: uploadStatus.status === 'uploading'
								? 'warning'
								: 'default'
						}>
						<AlertTitle className='flex items-center gap-2'>
							{uploadStatus.status === 'error' && (
								<AlertCircle className='h-4 w-4' />
							)}
							{uploadStatus.status === 'success' && (
								<Check className='h-4 w-4' />
							)}
							{uploadStatus.status === 'uploading' && (
								<span className='inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin' />
							)}
							{uploadStatus.status.charAt(0).toUpperCase() +
								uploadStatus.status.slice(1)}
						</AlertTitle>
						<AlertDescription>
							{uploadStatus.message}
							{analysisInfo && (
								<div className='mt-1 text-gray-700'>{analysisInfo}</div>
							)}
						</AlertDescription>
					</Alert>
				)}

				<DialogFooter className='mt-6'>
					<div className='flex w-full justify-between'>
						{uploadMode && (
							<Button variant='ghost' onClick={() => setUploadMode(null)}>
								Back
							</Button>
						)}
						<div className='flex gap-3 ml-auto'>
							<Button variant='outline' onClick={handleClose}>
								Cancel
							</Button>
							{uploadMode && (
								<Button
									onClick={handleSubmit}
									disabled={
										uploadStatus?.status === 'uploading' ||
										(uploadMode === 'file' && selectedFiles.length === 0) ||
										(uploadMode === 'editor' && !editorContent.trim())
									}>
									Upload Documents
								</Button>
							)}
						</div>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
